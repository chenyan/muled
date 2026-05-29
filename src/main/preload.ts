import { contextBridge, ipcRenderer } from 'electron';
import type { IpcChannel, IpcArgs, IpcResult } from '../shared/types/ipc';

async function invoke<C extends IpcChannel>(
  channel: C,
  arg?: IpcArgs<C>,
): Promise<IpcResult<C>> {
  return ipcRenderer.invoke(channel, arg) as Promise<IpcResult<C>>;
}

const muled = {
  config: {
    get: () => invoke('config:get'),
    getWysiwygCss: () => invoke('config:getWysiwygCss'),
    onWysiwygThemeChanged: (
      listener: (payload: {
        css: string;
        theme: 'light' | 'dark';
      }) => void,
    ) => {
      const handler = (
        _event: Electron.IpcRendererEvent,
        payload: { css: string; theme: 'light' | 'dark' },
      ) => {
        listener(payload);
      };
      ipcRenderer.on('config:wysiwygThemeChanged', handler);
      return () => {
        ipcRenderer.removeListener('config:wysiwygThemeChanged', handler);
      };
    },
  },
  workspace: {
    get: () => invoke('workspace:get'),
    list: () => invoke('workspace:list'),
    cd: (path: string) => invoke('workspace:cd', { path }),
    completeCd: (partial: string) =>
      invoke('workspace:completeCd', { partial }),
  },
  file: {
    read: (path: string) => invoke('file:read', { path }),
    readBinary: (path: string) => invoke('file:readBinary', { path }),
    write: (path: string, content: string) =>
      invoke('file:write', { path, content }),
  },
  ai: {
    complete: (args: { prompt: string; selection: string }) =>
      invoke('ai:complete', args),
  },
};

contextBridge.exposeInMainWorld('muled', muled);

export type MuledAPI = typeof muled;
