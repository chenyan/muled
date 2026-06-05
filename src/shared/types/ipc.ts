import type { PublicConfig } from './config';
import type { SettingsForm, SettingsGetResult } from './settings';
import type { DetectToolsResult } from './tools';
import type { ResolvedThemeConfig, ThemeConfig } from './theme';
import type { SearchStartResult } from './search';

export interface FileReadResult {
  content: string;
  truncated: boolean;
  fileSize: number;
}

export interface FileReadBinaryResult {
  base64: string;
  mime: string;
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
  | 'workspace:list'
  | 'workspace:listChildren'
  | 'workspace:pdfOutline'
  | 'file:read'
  | 'file:readBinary'
  | 'file:write'
  | 'file:writeBinary'
  | 'ai:complete'
  | 'ai:translate'
  | 'search:start'
  | 'search:cancel'
  | 'shell:openExternal';

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
  'workspace:list': { args: void; result: { paths: string[] } };
  'workspace:listChildren': {
    args: { path: string };
    result: { paths: string[] };
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
}

export type IpcArgs<C extends IpcChannel> = IpcInvokeMap[C]['args'];
export type IpcResult<C extends IpcChannel> = IpcInvokeMap[C]['result'];
