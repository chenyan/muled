import fs from 'fs';
import { createRequire } from 'module';
import path from 'path';

const nodeRequire = createRequire(__filename);
import { IGNORED_DIR_NAMES, WORKSPACE_MAX_DEPTH } from '../../shared/constants';
import {
  assertPathInsideRoot,
  ensureParentDir,
  resolvePath,
} from '../../shared/pathUtils';
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

  pathExists(relativePath: string): boolean {
    try {
      const absolutePath = this.resolveRelativeWorkspacePath(relativePath);
      return fs.existsSync(absolutePath);
    } catch {
      return false;
    }
  }

  createFile(relativePath: string): string {
    const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
    if (!normalized || normalized.endsWith('/')) {
      throw new Error(`Invalid file path: ${relativePath}`);
    }
    const absolutePath = this.resolveRelativeWorkspacePath(normalized);
    if (fs.existsSync(absolutePath)) {
      throw new Error(`Already exists: ${normalized}`);
    }
    ensureParentDir(absolutePath);
    fs.writeFileSync(absolutePath, '', 'utf8');
    return normalized;
  }

  createDirectory(relativePath: string): string {
    const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
    if (!normalized) {
      throw new Error('Invalid directory path');
    }
    const withoutSlash = normalized.endsWith('/')
      ? normalized.slice(0, -1)
      : normalized;
    const absolutePath = this.resolveRelativeWorkspacePath(withoutSlash);
    if (fs.existsSync(absolutePath)) {
      throw new Error(`Already exists: ${withoutSlash}`);
    }
    ensureParentDir(absolutePath);
    fs.mkdirSync(absolutePath);
    return `${withoutSlash}/`;
  }

  renamePath(fromRelative: string, toRelative: string): string {
    const fromNormalized = fromRelative.replace(/\\/g, '/').replace(/^\/+/, '');
    const toNormalized = toRelative.replace(/\\/g, '/').replace(/^\/+/, '');
    if (!toNormalized) {
      throw new Error('Invalid rename path');
    }

    const fromAbsolute = this.resolveRelativeWorkspacePath(fromNormalized);
    if (!fs.existsSync(fromAbsolute)) {
      throw new Error(`Not found: ${fromRelative}`);
    }

    const fromIsDirectory = fs.statSync(fromAbsolute).isDirectory();
    const toWithoutSlash = toNormalized.endsWith('/')
      ? toNormalized.slice(0, -1)
      : toNormalized;
    const toAbsolute = this.resolveRelativeWorkspacePath(toWithoutSlash);
    if (fs.existsSync(toAbsolute)) {
      throw new Error(`Already exists: ${toRelative}`);
    }
    ensureParentDir(toAbsolute);
    fs.renameSync(fromAbsolute, toAbsolute);
    return fromIsDirectory ? `${toWithoutSlash}/` : toWithoutSlash;
  }

  deletePath(relativePath: string): void {
    const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
    if (!normalized) {
      throw new Error('Invalid path');
    }
    const withoutSlash = normalized.endsWith('/')
      ? normalized.slice(0, -1)
      : normalized;
    const absolutePath = this.resolveRelativeWorkspacePath(withoutSlash);
    if (!fs.existsSync(absolutePath)) {
      return;
    }
    const stat = fs.statSync(absolutePath);
    if (stat.isDirectory()) {
      fs.rmSync(absolutePath, { recursive: true, force: true });
      return;
    }
    fs.unlinkSync(absolutePath);
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
    pdfjs.GlobalWorkerOptions.workerSrc = nodeRequire.resolve(
      'pdfjs-dist/legacy/build/pdf.worker.mjs',
    );
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

  private resolveRelativeWorkspacePath(relativePath: string): string {
    const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
    const withoutTrailingSlash = normalized.endsWith('/')
      ? normalized.slice(0, -1)
      : normalized;
    const absolutePath = path.resolve(this.root, withoutTrailingSlash);
    const relative = path
      .relative(this.root, absolutePath)
      .split(path.sep)
      .join('/');
    if (
      relative === '' ||
      relative.startsWith('..') ||
      path.isAbsolute(relative)
    ) {
      throw new Error(`Path escapes workspace: ${absolutePath}`);
    }
    return absolutePath;
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
