import type { PublicConfig } from './config';
import type { SettingsForm, SettingsGetResult } from './settings';
import type {
  DetectToolsResult,
  SchemePtyCreateResponse,
  SchemeRunResponse,
} from './tools';
import type { ResolvedThemeConfig, ThemeConfig } from './theme';
import type { SearchStartResult } from './search';
import type { CsvQueryResponse, CsvRegisterResponse } from './csvQuery';
import type {
  SqliteListTablesResponse,
  SqliteOpenResponse,
  SqliteQueryResponse,
} from './sqliteQuery';
import type { WorkspaceHistoryInfo } from './workspaceHistory';

export interface FileReadResult {
  content: string;
  truncated: boolean;
  fileSize: number;
}

export interface FileReadBinaryResult {
  base64: string;
  mime: string;
}

/** PDF 等大二进制：经 IPC 结构化克隆传输，避免 base64 膨胀与解码 */
export interface FileReadBinaryBufferResult {
  data: Uint8Array;
  mime: string;
}

/** 任意文本文件的原始字节（用于 HTML 预览按编码解码） */
export interface FileReadBytesResult {
  data: Uint8Array;
}

export interface WorkspaceState {
  root: string;
  paths: string[];
  recent: string[];
}

export interface WorkspaceInfo {
  root: string;
  recent: string[];
}

export interface PdfOutlineItem {
  title: string;
  depth: number;
  page: number | null;
}

export interface OpenExternalDocumentPayload {
  openPath: string;
  parentDir: string;
  switchWorkspace: boolean;
}

export interface OpenExternalDirectoryPayload {
  /** 工作区内目录的相对路径（`''` 表示工作区根）；`null` 表示需切换工作区 */
  relativePath: string | null;
  absolutePath: string;
}

export type IpcChannel =
  | 'config:get'
  | 'config:getSettings'
  | 'config:detectTools'
  | 'config:save'
  | 'config:getWysiwygCss'
  | 'workspace:get'
  | 'workspace:cd'
  | 'workspace:completeCd'
  | 'workspace:getHistory'
  | 'workspace:removeFromHistory'
  | 'workspace:setPinned'
  | 'workspace:list'
  | 'workspace:listChildren'
  | 'workspace:exists'
  | 'workspace:createFile'
  | 'workspace:createDirectory'
  | 'workspace:rename'
  | 'workspace:delete'
  | 'workspace:pdfOutline'
  | 'file:read'
  | 'file:readBinary'
  | 'file:readBinaryBuffer'
  | 'file:readBytes'
  | 'file:write'
  | 'file:writeBinary'
  | 'ai:complete'
  | 'ai:translate'
  | 'search:start'
  | 'search:cancel'
  | 'shell:openExternal'
  | 'csv:register'
  | 'csv:query'
  | 'csv:close'
  | 'sqlite:open'
  | 'sqlite:query'
  | 'sqlite:listTables'
  | 'sqlite:close'
  | 'duckdbFile:open'
  | 'duckdbFile:query'
  | 'duckdbFile:listTables'
  | 'duckdbFile:close'
  | 'scheme:available'
  | 'scheme:run'
  | 'scheme:pty:create'
  | 'scheme:pty:write'
  | 'scheme:pty:resize'
  | 'scheme:pty:kill';

export interface WysiwygCssResult {
  css: string;
  theme: 'light' | 'dark' | 'acme';
  paths: {
    light: string;
    dark: string;
    acme: string;
  };
}

export interface ThemeChangedPayload {
  theme: ThemeConfig;
  resolved: ResolvedThemeConfig;
  wysiwyg: WysiwygCssResult;
}

export interface ConfigSaveResult {
  config: PublicConfig;
  /** 设置中的 workspace.path 相对保存前是否发生变化 */
  workspacePathChanged: boolean;
}

export interface ConfigChangedPayload {
  config: PublicConfig;
  workspacePathChanged: boolean;
}

export interface IpcInvokeMap {
  'config:get': { args: void; result: PublicConfig };
  'config:getSettings': { args: void; result: SettingsGetResult };
  'config:detectTools': { args: void; result: DetectToolsResult };
  'config:save': { args: SettingsForm; result: ConfigSaveResult };
  'config:getWysiwygCss': { args: void; result: WysiwygCssResult };
  'workspace:get': { args: void; result: WorkspaceInfo };
  'workspace:cd': { args: { path: string }; result: WorkspaceState };
  'workspace:completeCd': {
    args: { partial: string };
    result: { labels: string[] };
  };
  'workspace:getHistory': { args: void; result: WorkspaceHistoryInfo };
  'workspace:removeFromHistory': {
    args: { path: string };
    result: WorkspaceHistoryInfo;
  };
  'workspace:setPinned': {
    args: { path: string; pinned: boolean };
    result: WorkspaceHistoryInfo;
  };
  'workspace:list': { args: void; result: { paths: string[] } };
  'workspace:listChildren': {
    args: { path: string };
    result: { paths: string[] };
  };
  'workspace:exists': {
    args: { path: string };
    result: { exists: boolean };
  };
  'workspace:createFile': {
    args: { path: string };
    result: { path: string };
  };
  'workspace:createDirectory': {
    args: { path: string };
    result: { path: string };
  };
  'workspace:rename': {
    args: { from: string; to: string };
    result: { path: string };
  };
  'workspace:delete': {
    args: { path: string };
    result: { ok: boolean };
  };
  'workspace:pdfOutline': {
    args: { path: string };
    result: { items: PdfOutlineItem[] };
  };
  'file:read': { args: { path: string }; result: FileReadResult };
  'file:readBinary': {
    args: { path: string };
    result: FileReadBinaryResult;
  };
  'file:readBinaryBuffer': {
    args: { path: string };
    result: FileReadBinaryBufferResult;
  };
  'file:readBytes': {
    args: { path: string };
    result: FileReadBytesResult;
  };
  'file:write': {
    args: { path: string; content: string };
    result: { ok: boolean };
  };
  'file:writeBinary': {
    args: { path: string; base64: string };
    result: { ok: boolean };
  };
  'ai:complete': {
    args: { prompt: string; selection: string };
    result: { text: string } | { error: string };
  };
  'ai:translate': {
    args: { sentence: string };
    result: { text: string } | { error: string };
  };
  'search:start': {
    args: { searchId: number; command: 'rg' | 'fd'; query: string };
    result: SearchStartResult;
  };
  'search:cancel': {
    args: { searchId: number };
    result: { ok: boolean };
  };
  'shell:openExternal': {
    args: { url: string };
    result: { ok: boolean };
  };
  'csv:register': {
    args: {
      sessionId: string;
      content: string;
    };
    result: CsvRegisterResponse;
  };
  'csv:query': {
    args: { sessionId: string; sql: string };
    result: CsvQueryResponse;
  };
  'csv:close': {
    args: { sessionId: string };
    result: { ok: boolean };
  };
  'sqlite:open': {
    args: { sessionId: string; path: string };
    result: SqliteOpenResponse;
  };
  'sqlite:query': {
    args: { sessionId: string; sql: string };
    result: SqliteQueryResponse;
  };
  'sqlite:listTables': {
    args: { sessionId: string };
    result: SqliteListTablesResponse;
  };
  'sqlite:close': {
    args: { sessionId: string };
    result: { ok: boolean };
  };
  'duckdbFile:open': {
    args: { sessionId: string; path: string };
    result: SqliteOpenResponse;
  };
  'duckdbFile:query': {
    args: { sessionId: string; sql: string };
    result: SqliteQueryResponse;
  };
  'duckdbFile:listTables': {
    args: { sessionId: string };
    result: SqliteListTablesResponse;
  };
  'duckdbFile:close': {
    args: { sessionId: string };
    result: { ok: boolean };
  };
  'scheme:available': {
    args: void;
    result: { available: boolean };
  };
  'scheme:run': {
    args: { code?: string; path?: string };
    result: SchemeRunResponse;
  };
  'scheme:pty:create': {
    args: {
      path?: string;
      code?: string;
      cols: number;
      rows: number;
    };
    result: SchemePtyCreateResponse;
  };
  'scheme:pty:write': {
    args: { sessionId: string; data: string };
    result: { ok: boolean };
  };
  'scheme:pty:resize': {
    args: { sessionId: string; cols: number; rows: number };
    result: { ok: boolean };
  };
  'scheme:pty:kill': {
    args: { sessionId: string };
    result: { ok: boolean };
  };
}

export type IpcArgs<C extends IpcChannel> = IpcInvokeMap[C]['args'];
export type IpcResult<C extends IpcChannel> = IpcInvokeMap[C]['result'];
