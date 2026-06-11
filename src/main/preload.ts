import { contextBridge, ipcRenderer } from 'electron';
import type { SettingsForm } from '../shared/types/settings';
import type { IpcChannel, IpcArgs, IpcResult } from '../shared/types/ipc';
import type { SearchStreamEvent } from '../shared/types/search';

async function invoke<C extends IpcChannel>(
  channel: C,
  arg?: IpcArgs<C>,
): Promise<IpcResult<C>> {
  return ipcRenderer.invoke(channel, arg) as Promise<IpcResult<C>>;
}

const muled = {
  config: {
    get: () => invoke('config:get'),
    getSettings: () => invoke('config:getSettings'),
    detectTools: () => invoke('config:detectTools'),
    save: (settings: SettingsForm) => invoke('config:save', settings),
    getWysiwygCss: () => invoke('config:getWysiwygCss'),
    onThemeChanged: (
      listener: (payload: import('../shared/types/ipc').ThemeChangedPayload) => void,
    ) => {
      const handler = (
        _event: Electron.IpcRendererEvent,
        payload: import('../shared/types/ipc').ThemeChangedPayload,
      ) => {
        listener(payload);
      };
      ipcRenderer.on('config:themeChanged', handler);
      return () => {
        ipcRenderer.removeListener('config:themeChanged', handler);
      };
    },
    onConfigChanged: (
      listener: (
        payload: import('../shared/types/ipc').ConfigChangedPayload,
      ) => void,
    ) => {
      const handler = (
        _event: Electron.IpcRendererEvent,
        payload: import('../shared/types/ipc').ConfigChangedPayload,
      ) => {
        listener(payload);
      };
      ipcRenderer.on('config:changed', handler);
      return () => {
        ipcRenderer.removeListener('config:changed', handler);
      };
    },
  },
  workspace: {
    get: () => invoke('workspace:get'),
    list: () => invoke('workspace:list'),
    listChildren: (path: string) => invoke('workspace:listChildren', { path }),
    exists: (path: string) => invoke('workspace:exists', { path }),
    createFile: (path: string) => invoke('workspace:createFile', { path }),
    createDirectory: (path: string) =>
      invoke('workspace:createDirectory', { path }),
    rename: (args: { from: string; to: string }) =>
      invoke('workspace:rename', args),
    delete: (path: string) => invoke('workspace:delete', { path }),
    pdfOutline: (path: string) => invoke('workspace:pdfOutline', { path }),
    cd: (path: string) => invoke('workspace:cd', { path }),
    completeCd: (partial: string) =>
      invoke('workspace:completeCd', { partial }),
    getHistory: () => invoke('workspace:getHistory'),
    removeFromHistory: (args: { path: string }) =>
      invoke('workspace:removeFromHistory', args),
    setPinned: (args: { path: string; pinned: boolean }) =>
      invoke('workspace:setPinned', args),
    onFilesystemChanged: (listener: () => void) => {
      const handler = () => {
        listener();
      };
      ipcRenderer.on('workspace:filesystemChanged', handler);
      return () => {
        ipcRenderer.removeListener('workspace:filesystemChanged', handler);
      };
    },
  },
  file: {
    read: (path: string) => invoke('file:read', { path }),
    readBinary: (path: string) => invoke('file:readBinary', { path }),
    readBinaryBuffer: (path: string) =>
      invoke('file:readBinaryBuffer', { path }),
    write: (path: string, content: string) =>
      invoke('file:write', { path, content }),
    writeBinary: (path: string, base64: string) =>
      invoke('file:writeBinary', { path, base64 }),
  },
  ai: {
    complete: (args: { prompt: string; selection: string }) =>
      invoke('ai:complete', args),
    translate: (args: { sentence: string }) =>
      invoke('ai:translate', args),
  },
  search: {
    start: (args: {
      searchId: number;
      command: 'rg' | 'fd';
      query: string;
    }) => invoke('search:start', args),
    cancel: (searchId: number) => invoke('search:cancel', { searchId }),
    onStream: (listener: (event: SearchStreamEvent) => void) => {
      const handler = (
        _event: Electron.IpcRendererEvent,
        payload: SearchStreamEvent,
      ) => {
        listener(payload);
      };
      ipcRenderer.on('search:stream', handler);
      return () => {
        ipcRenderer.removeListener('search:stream', handler);
      };
    },
  },
  shell: {
    openExternal: (url: string) => invoke('shell:openExternal', { url }),
  },
  csv: {
    register: (args: { sessionId: string; content: string }) =>
      invoke('csv:register', args),
    query: (args: { sessionId: string; sql: string }) =>
      invoke('csv:query', args),
    close: (sessionId: string) => invoke('csv:close', { sessionId }),
  },
  sqlite: {
    open: (args: { sessionId: string; path: string }) =>
      invoke('sqlite:open', args),
    query: (args: { sessionId: string; sql: string }) =>
      invoke('sqlite:query', args),
    listTables: (sessionId: string) =>
      invoke('sqlite:listTables', { sessionId }),
    close: (sessionId: string) => invoke('sqlite:close', { sessionId }),
  },
  duckdbFile: {
    open: (args: { sessionId: string; path: string }) =>
      invoke('duckdbFile:open', args),
    query: (args: { sessionId: string; sql: string }) =>
      invoke('duckdbFile:query', args),
    listTables: (sessionId: string) =>
      invoke('duckdbFile:listTables', { sessionId }),
    close: (sessionId: string) => invoke('duckdbFile:close', { sessionId }),
  },
  menu: {
    onOpenTranslationHistory: (listener: (path: string) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, path: string) => {
        listener(path);
      };
      ipcRenderer.on('menu:openTranslationHistory', handler);
      return () => {
        ipcRenderer.removeListener('menu:openTranslationHistory', handler);
      };
    },
    onOpenExternalDocument: (
      listener: (
        payload: import('../shared/types/ipc').OpenExternalDocumentPayload,
      ) => void,
    ) => {
      const handler = (
        _event: Electron.IpcRendererEvent,
        payload: import('../shared/types/ipc').OpenExternalDocumentPayload,
      ) => {
        listener(payload);
      };
      ipcRenderer.on('menu:openExternalDocument', handler);
      return () => {
        ipcRenderer.removeListener('menu:openExternalDocument', handler);
      };
    },
    onOpenExternalDirectory: (
      listener: (
        payload: import('../shared/types/ipc').OpenExternalDirectoryPayload,
      ) => void,
    ) => {
      const handler = (
        _event: Electron.IpcRendererEvent,
        payload: import('../shared/types/ipc').OpenExternalDirectoryPayload,
      ) => {
        listener(payload);
      };
      ipcRenderer.on('menu:openExternalDirectory', handler);
      return () => {
        ipcRenderer.removeListener('menu:openExternalDirectory', handler);
      };
    },
  },
};

contextBridge.exposeInMainWorld('muled', muled);

export type MuledAPI = typeof muled;
