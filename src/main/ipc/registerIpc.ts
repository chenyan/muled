import { ipcMain, nativeTheme, type BrowserWindow } from 'electron';
import type { IpcChannel } from '../../shared/types/ipc';
import ConfigService, { ensureConfigFile } from '../services/configService';
import {
  ensureWysiwygStyleFiles,
  readWysiwygCss,
  resolveWysiwygTheme,
  getWysiwygStylePaths,
} from '../services/wysiwygStyleService';
import FileService from '../services/fileService';
import OpenAIService from '../services/openaiService';
import {
  loadRecentWorkspaces,
  recordRecentWorkspace,
} from '../services/recentWorkspacesService';
import { listCdPathCompletionLabels } from '../services/cdPathCompletionService';
import WorkspaceService from '../services/workspaceService';

export interface MuledServices {
  config: ConfigService;
  workspace: WorkspaceService;
  file: FileService;
  openai: OpenAIService;
}

export function createServices(): MuledServices {
  const config = new ConfigService();
  ensureConfigFile();
  ensureWysiwygStyleFiles();
  config.load();
  const workspace = new WorkspaceService(config);
  recordRecentWorkspace(workspace.getRoot());
  const file = new FileService(config, workspace);
  const openai = new OpenAIService(config);
  return { config, workspace, file, openai };
}

export function registerIpc(services: MuledServices): void {
  const handlers: Record<IpcChannel, (...args: unknown[]) => unknown> = {
    'config:get': () => services.config.getPublicConfig(),

    'config:getWysiwygCss': () => {
      const theme = resolveWysiwygTheme();
      return {
        css: readWysiwygCss(theme),
        theme,
        paths: getWysiwygStylePaths(),
      };
    },

    'workspace:get': () => ({
      root: services.workspace.getRoot(),
      recent: loadRecentWorkspaces(),
    }),

    'workspace:list': () => ({ paths: services.workspace.listPaths() }),

    'workspace:cd': (arg) => {
      const { path: nextPath } = arg as { path: string };
      const root = services.workspace.setRoot(nextPath);
      const recent = recordRecentWorkspace(root);
      return {
        root,
        paths: services.workspace.listPaths(),
        recent,
      };
    },

    'workspace:completeCd': (arg) => {
      const { partial } = arg as { partial: string };
      return {
        labels: listCdPathCompletionLabels(partial, loadRecentWorkspaces()),
      };
    },

    'file:read': (arg) => {
      const { path: filePath } = arg as { path: string };
      return services.file.read(filePath);
    },

    'file:readBinary': (arg) => {
      const { path: filePath } = arg as { path: string };
      return services.file.readBinary(filePath);
    },

    'file:write': (arg) => {
      const { path: filePath, content } = arg as {
        path: string;
        content: string;
      };
      return services.file.write(filePath, content);
    },

    'ai:complete': (arg) => {
      const { prompt, selection } = arg as {
        prompt: string;
        selection: string;
      };
      return services.openai.complete(prompt, selection);
    },
  };

  (Object.keys(handlers) as IpcChannel[]).forEach((channel) => {
    ipcMain.handle(channel, async (_event, arg) => {
      return handlers[channel](arg);
    });
  });
}

export function registerWysiwygThemeWatcher(getWindow: () => BrowserWindow | null): void {
  nativeTheme.on('updated', () => {
    const win = getWindow();
    if (!win || win.isDestroyed()) return;
    const theme = resolveWysiwygTheme();
    win.webContents.send('config:wysiwygThemeChanged', {
      css: readWysiwygCss(theme),
      theme,
    });
  });
}
