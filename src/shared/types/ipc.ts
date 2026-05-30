import type { PublicConfig } from './config';
import type { SettingsForm, SettingsGetResult } from './settings';
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

export type IpcChannel =
  | 'config:get'
  | 'config:getSettings'
  | 'config:save'
  | 'config:getWysiwygCss'
  | 'workspace:get'
  | 'workspace:cd'
  | 'workspace:completeCd'
  | 'workspace:list'
  | 'file:read'
  | 'file:readBinary'
  | 'file:write'
  | 'ai:complete'
  | 'ai:translate'
  | 'search:start'
  | 'search:cancel';

export interface WysiwygCssResult {
  css: string;
  theme: 'light' | 'dark';
  paths: {
    light: string;
    dark: string;
  };
}

export interface IpcInvokeMap {
  'config:get': { args: void; result: PublicConfig };
  'config:getSettings': { args: void; result: SettingsGetResult };
  'config:save': { args: SettingsForm; result: PublicConfig };
  'config:getWysiwygCss': { args: void; result: WysiwygCssResult };
  'workspace:get': { args: void; result: WorkspaceInfo };
  'workspace:cd': { args: { path: string }; result: WorkspaceState };
  'workspace:completeCd': {
    args: { partial: string };
    result: { labels: string[] };
  };
  'workspace:list': { args: void; result: { paths: string[] } };
  'file:read': { args: { path: string }; result: FileReadResult };
  'file:readBinary': {
    args: { path: string };
    result: FileReadBinaryResult;
  };
  'file:write': {
    args: { path: string; content: string };
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
}

export type IpcArgs<C extends IpcChannel> = IpcInvokeMap[C]['args'];
export type IpcResult<C extends IpcChannel> = IpcInvokeMap[C]['result'];
