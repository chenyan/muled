export const MAX_RECENT_WORKSPACES = 10;

export interface WorkspaceHistoryEntry {
  path: string;
  pinned: boolean;
}

export interface WorkspaceHistoryInfo {
  entries: WorkspaceHistoryEntry[];
  /** 工作区下拉与路径补全用的合并列表（固定项在前） */
  pickerPaths: string[];
}
