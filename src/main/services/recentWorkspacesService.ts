import fs from 'fs';
import {
  ensureParentDir,
  getRecentWorkspacesFilePath,
  resolvePath,
} from '../../shared/pathUtils';

export const MAX_RECENT_WORKSPACES = 10;

let recentWorkspacesFilePathOverride: string | null = null;

/** 仅用于单元测试：指向临时文件，避免读写真实配置 */
export function setRecentWorkspacesFilePathForTests(
  filePath: string | null,
): void {
  recentWorkspacesFilePathOverride = filePath;
}

function recentWorkspacesFilePath(): string {
  return recentWorkspacesFilePathOverride ?? getRecentWorkspacesFilePath();
}

function normalizeWorkspacePath(workspacePath: string): string {
  return resolvePath(workspacePath);
}

export function loadRecentWorkspaces(): string[] {
  const filePath = recentWorkspacesFilePath();
  if (!fs.existsSync(filePath)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    const seen = new Set<string>();
    const result: string[] = [];
    for (const entry of parsed) {
      if (typeof entry !== 'string' || entry.length === 0) continue;
      const resolved = normalizeWorkspacePath(entry);
      if (seen.has(resolved)) continue;
      seen.add(resolved);
      result.push(resolved);
      if (result.length >= MAX_RECENT_WORKSPACES) break;
    }
    return result;
  } catch {
    return [];
  }
}

export function recordRecentWorkspace(workspacePath: string): string[] {
  const resolved = normalizeWorkspacePath(workspacePath);
  const next = [
    resolved,
    ...loadRecentWorkspaces().filter((p) => p !== resolved),
  ].slice(0, MAX_RECENT_WORKSPACES);

  const filePath = recentWorkspacesFilePath();
  ensureParentDir(filePath);
  fs.writeFileSync(filePath, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  return next;
}
