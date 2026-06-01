import fs from 'fs';
import path from 'path';
import { IGNORED_DIR_NAMES, WORKSPACE_MAX_DEPTH } from '../../shared/constants';
import { assertPathInsideRoot, resolvePath } from '../../shared/pathUtils';
import type { PdfOutlineItem } from '../../shared/types/ipc';
import type ConfigService from './configService';

export default class WorkspaceService {
  private root: string;

  constructor(private readonly configService: ConfigService) {
    this.root = configService.get().workspace.path;
  }

  getRoot(): string {
    return this.root;
  }

  setRoot(nextRoot: string): string {
    const resolved = resolvePath(nextRoot, this.root);
    if (!fs.existsSync(resolved)) {
      throw new Error(`Workspace does not exist: ${resolved}`);
    }
    const stat = fs.statSync(resolved);
    if (!stat.isDirectory()) {
      throw new Error(`Workspace is not a directory: ${resolved}`);
    }
    this.root = resolved;
    return this.root;
  }

  listPaths(): string[] {
    const results: string[] = [];
    this.walk(this.root, this.root, 0, results);
    return results.sort();
  }

  listChildren(relativeDir: string): string[] {
    const normalizedInput = relativeDir.replace(/\\/g, '/').replace(/^\/+/, '');
    const normalizedDir =
      normalizedInput === ''
        ? ''
        : normalizedInput.endsWith('/')
          ? normalizedInput
          : `${normalizedInput}/`;
    const absoluteDir = assertPathInsideRoot(
      this.root,
      path.resolve(this.root, normalizedDir),
    );

    let stat: fs.Stats;
    try {
      stat = fs.statSync(absoluteDir);
    } catch {
      return [];
    }
    if (!stat.isDirectory()) {
      return [];
    }

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(absoluteDir, { withFileTypes: true });
    } catch {
      return [];
    }

    const children: string[] = [];
    entries.forEach((entry) => {
      if (entry.name.startsWith('.')) return;
      if (entry.isDirectory() && IGNORED_DIR_NAMES.has(entry.name)) return;
      if (!entry.isDirectory() && !entry.isFile()) return;

      const childPath = normalizedDir
        ? `${normalizedDir}${entry.name}`
        : entry.name;
      children.push(entry.isDirectory() ? `${childPath}/` : childPath);
    });

    return children.sort((a, b) => {
      const nameA = a.replace(/\/$/, '').split('/').pop() ?? a;
      const nameB = b.replace(/\/$/, '').split('/').pop() ?? b;
      return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
    });
  }

  async listPdfOutline(relativePath: string): Promise<PdfOutlineItem[]> {
    const absolutePath = this.resolveWorkspacePath(relativePath);
    const stat = fs.statSync(absolutePath);
    if (!stat.isFile()) {
      throw new Error(`Not a file: ${relativePath}`);
    }
    if (path.extname(absolutePath).toLowerCase() !== '.pdf') {
      return [];
    }

    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(fs.readFileSync(absolutePath)),
    });
    const document = await loadingTask.promise;
    try {
      const outline = await document.getOutline();
      if (!outline || outline.length === 0) {
        return [];
      }

      const items: PdfOutlineItem[] = [];
      const flatten = async (
        nodes: Array<{
          title: string;
          items?: unknown[];
          dest?: unknown;
        }>,
        depth: number,
      ) => {
        for (const node of nodes) {
          const page = await this.resolvePdfOutlinePage(
            document as unknown as {
              getDestination: (name: string) => Promise<unknown>;
              getPageIndex: (ref: unknown) => Promise<number>;
            },
            node.dest,
          );
          items.push({
            title: node.title || 'Untitled',
            depth,
            page,
          });
          const children = Array.isArray(node.items)
            ? (node.items as Array<{ title: string; items?: unknown[]; dest?: unknown }>)
            : [];
          if (children.length > 0) {
            await flatten(children, depth + 1);
          }
        }
      };

      await flatten(outline as Array<{ title: string; items?: unknown[]; dest?: unknown }>, 1);
      return items;
    } finally {
      await loadingTask.destroy();
    }
  }

  private async resolvePdfOutlinePage(
    document: {
      getDestination: (name: string) => Promise<unknown>;
      getPageIndex: (ref: unknown) => Promise<number>;
    },
    dest: unknown,
  ): Promise<number | null> {
    if (!dest) return null;
    let resolvedDest: unknown = dest;
    if (typeof dest === 'string') {
      resolvedDest = await document.getDestination(dest);
    }
    if (!Array.isArray(resolvedDest) || resolvedDest.length === 0) {
      return null;
    }
    const pageRef = resolvedDest[0];
    if (typeof pageRef !== 'object' || pageRef === null) {
      return null;
    }
    try {
      const pageIndex = await document.getPageIndex(pageRef);
      return pageIndex + 1;
    } catch {
      return null;
    }
  }

  private resolveWorkspacePath(relativePath: string): string {
    const resolved = resolvePath(relativePath, this.root);
    return assertPathInsideRoot(this.root, resolved);
  }

  private walk(
    absoluteDir: string,
    workspaceRoot: string,
    depth: number,
    results: string[],
  ): void {
    if (depth > WORKSPACE_MAX_DEPTH) {
      return;
    }

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(absoluteDir, { withFileTypes: true });
    } catch {
      return;
    }

    entries.forEach((entry) => {
      if (entry.name.startsWith('.')) {
        return;
      }

      const absolutePath = path.join(absoluteDir, entry.name);
      const relativePath = path
        .relative(workspaceRoot, absolutePath)
        .split(path.sep)
        .join('/');

      if (entry.isDirectory()) {
        if (IGNORED_DIR_NAMES.has(entry.name)) {
          return;
        }
        results.push(`${relativePath}/`);
        this.walk(absolutePath, workspaceRoot, depth + 1, results);
        return;
      }
      if (entry.isFile()) {
        results.push(relativePath);
      }
    });
  }
}
