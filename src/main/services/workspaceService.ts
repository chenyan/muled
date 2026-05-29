import fs from 'fs';
import path from 'path';
import { IGNORED_DIR_NAMES, WORKSPACE_MAX_DEPTH } from '../../shared/constants';
import { resolvePath } from '../../shared/pathUtils';
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
