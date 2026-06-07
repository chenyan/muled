import fs from 'fs';
import {
  ensureParentDir,
  getRecentWorkspacesFilePath,
  resolvePath,
} from '../../shared/pathUtils';
import {
  MAX_RECENT_WORKSPACES,
  type WorkspaceHistoryEntry,
  type WorkspaceHistoryInfo,
} from '../../shared/types/workspaceHistory';

export { MAX_RECENT_WORKSPACES };

interface WorkspaceHistoryData {
  pinned: string[];
  recent: string[];
}

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

function dedupePaths(paths: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const entry of paths) {
    if (!entry || seen.has(entry)) continue;
    seen.add(entry);
    result.push(entry);
  }
  return result;
}

function normalizePathList(paths: readonly unknown[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const entry of paths) {
    if (typeof entry !== 'string' || entry.length === 0) continue;
    const resolved = normalizeWorkspacePath(entry);
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    result.push(resolved);
  }
  return result;
}

function parseStoredHistory(raw: string): WorkspaceHistoryData {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return {
        pinned: [],
        recent: normalizePathList(parsed).slice(0, MAX_RECENT_WORKSPACES),
      };
    }
    if (parsed && typeof parsed === 'object') {
      const record = parsed as Record<string, unknown>;
      const pinned = normalizePathList(
        Array.isArray(record.pinned) ? record.pinned : [],
      );
      const pinnedSet = new Set(pinned);
      const recent = normalizePathList(
        Array.isArray(record.recent) ? record.recent : [],
      )
        .filter((entry) => !pinnedSet.has(entry))
        .slice(0, MAX_RECENT_WORKSPACES);
      return { pinned, recent };
    }
  } catch {
    /* fall through */
  }
  return { pinned: [], recent: [] };
}

function loadWorkspaceHistoryData(): WorkspaceHistoryData {
  const filePath = recentWorkspacesFilePath();
  if (!fs.existsSync(filePath)) {
    return { pinned: [], recent: [] };
  }
  try {
    return parseStoredHistory(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return { pinned: [], recent: [] };
  }
}

function saveWorkspaceHistoryData(data: WorkspaceHistoryData): void {
  const pinned = dedupePaths(data.pinned);
  const pinnedSet = new Set(pinned);
  const recent = dedupePaths(data.recent)
    .filter((entry) => !pinnedSet.has(entry))
    .slice(0, MAX_RECENT_WORKSPACES);
  const normalized = { pinned, recent };
  const filePath = recentWorkspacesFilePath();
  ensureParentDir(filePath);
  fs.writeFileSync(
    filePath,
    `${JSON.stringify(normalized, null, 2)}\n`,
    'utf8',
  );
}

function toPickerPaths(data: WorkspaceHistoryData): string[] {
  return dedupePaths([...data.pinned, ...data.recent]);
}

function toHistoryInfo(data: WorkspaceHistoryData): WorkspaceHistoryInfo {
  const entries: WorkspaceHistoryEntry[] = [
    ...data.pinned.map((entry) => ({ path: entry, pinned: true })),
    ...data.recent.map((entry) => ({ path: entry, pinned: false })),
  ];
  return {
    entries,
    pickerPaths: toPickerPaths(data),
  };
}

function persistAndInfo(data: WorkspaceHistoryData): WorkspaceHistoryInfo {
  saveWorkspaceHistoryData(data);
  return toHistoryInfo(loadWorkspaceHistoryData());
}

/** 工作区下拉与路径补全用的合并列表（固定项在前，不含当前根目录） */
export function loadRecentWorkspaces(): string[] {
  return toPickerPaths(loadWorkspaceHistoryData());
}

export function loadWorkspaceHistory(): WorkspaceHistoryInfo {
  return toHistoryInfo(loadWorkspaceHistoryData());
}

export function recordRecentWorkspace(workspacePath: string): string[] {
  const resolved = normalizeWorkspacePath(workspacePath);
  const data = loadWorkspaceHistoryData();
  if (data.pinned.includes(resolved)) {
    return toPickerPaths(data);
  }
  const nextRecent = [
    resolved,
    ...data.recent.filter((entry) => entry !== resolved),
  ].slice(0, MAX_RECENT_WORKSPACES);
  saveWorkspaceHistoryData({ ...data, recent: nextRecent });
  return toPickerPaths(loadWorkspaceHistoryData());
}

export function removeWorkspaceFromHistory(workspacePath: string): WorkspaceHistoryInfo {
  const resolved = normalizeWorkspacePath(workspacePath);
  const data = loadWorkspaceHistoryData();
  return persistAndInfo({
    pinned: data.pinned.filter((entry) => entry !== resolved),
    recent: data.recent.filter((entry) => entry !== resolved),
  });
}

export function setWorkspacePinned(
  workspacePath: string,
  pinned: boolean,
): WorkspaceHistoryInfo {
  const resolved = normalizeWorkspacePath(workspacePath);
  const data = loadWorkspaceHistoryData();
  if (pinned) {
    const nextPinned = data.pinned.includes(resolved)
      ? data.pinned
      : [...data.pinned, resolved];
    const nextRecent = data.recent.filter((entry) => entry !== resolved);
    return persistAndInfo({ pinned: nextPinned, recent: nextRecent });
  }

  const nextPinned = data.pinned.filter((entry) => entry !== resolved);
  const nextRecent = data.recent.includes(resolved)
    ? data.recent
    : [resolved, ...data.recent].slice(0, MAX_RECENT_WORKSPACES);
  return persistAndInfo({ pinned: nextPinned, recent: nextRecent });
}
