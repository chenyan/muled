import { ipcMain, nativeTheme, type BrowserWindow, type WebContents } from 'electron';
import type { IpcChannel, ThemeChangedPayload } from '../../shared/types/ipc';
import type {
  SearchStreamEvent,
  ShellSearchError,
  ShellSearchMatch,
} from '../../shared/types/search';
import ConfigService, { ensureConfigFile } from '../services/configService';
import {
  ensureWysiwygStyleFiles,
  readWysiwygCss,
  getWysiwygStylePaths,
} from '../services/wysiwygStyleService';
import FileService from '../services/fileService';
import OpenAIService from '../services/openaiService';
import {
  loadRecentWorkspaces,
  recordRecentWorkspace,
} from '../services/recentWorkspacesService';
import { listCdPathCompletionLabels } from '../services/cdPathCompletionService';
import {
  streamFdSearch,
  streamRgSearch,
  type RunningSearch,
} from '../services/shellSearchService';
import WorkspaceService from '../services/workspaceService';
import { detectToolPaths } from '../services/toolPathService';

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

function buildThemePayload(config: ConfigService): ThemeChangedPayload {
  const publicConfig = config.getPublicConfig();
  const resolved = publicConfig.theme.resolved;
  const wysiwygTheme = resolved.wysiwyg;
  return {
    theme: {
      ui: publicConfig.theme.ui,
      wysiwyg: publicConfig.theme.wysiwyg,
      source: publicConfig.theme.source,
    },
    resolved,
    wysiwyg: {
      css: readWysiwygCss(wysiwygTheme),
      theme: wysiwygTheme,
      paths: getWysiwygStylePaths(),
    },
  };
}

function sendThemeChanged(
  win: BrowserWindow,
  config: ConfigService,
): void {
  if (win.isDestroyed()) return;
  win.webContents.send('config:themeChanged', buildThemePayload(config));
}

function sendSearchEvent(
  sender: WebContents,
  event: SearchStreamEvent,
): void {
  if (sender.isDestroyed()) {
    return;
  }
  sender.send('search:stream', event);
}

export function registerIpc(
  services: MuledServices,
  getWindow?: () => BrowserWindow | null,
): void {
  const activeSearches = new Map<number, RunningSearch>();

  const cancelSearch = (searchId: number) => {
    const running = activeSearches.get(searchId);
    if (!running) {
      return;
    }
    running.kill();
    activeSearches.delete(searchId);
  };

  const handlers: Record<IpcChannel, (...args: unknown[]) => unknown> = {
    'config:get': () => services.config.getPublicConfig(),

    'config:getSettings': () => services.config.getSettings(),

    'config:detectTools': () => detectToolPaths(),

    'config:save': (arg) => {
      const settings = arg as Parameters<ConfigService['saveSettings']>[0];
      const publicConfig = services.config.saveSettings(settings);
      const nextRoot = services.config.get().workspace.path;
      if (services.workspace.getRoot() !== nextRoot) {
        try {
          services.workspace.setRoot(nextRoot);
        } catch {
          /* 工作区路径无效时保留当前根目录，仅更新配置文件 */
        }
      }
      const win = getWindow?.();
      if (win) {
        sendThemeChanged(win, services.config);
      }
      return publicConfig;
    },

    'config:getWysiwygCss': () => buildThemePayload(services.config).wysiwyg,

    'workspace:get': () => ({
      root: services.workspace.getRoot(),
      recent: loadRecentWorkspaces(),
    }),

    'workspace:list': () => ({ paths: services.workspace.listPaths() }),

    'workspace:listChildren': (arg) => {
      const { path: directoryPath } = arg as { path: string };
      return { paths: services.workspace.listChildren(directoryPath) };
    },

    'workspace:pdfOutline': async (arg) => {
      const { path: relativePath } = arg as { path: string };
      return { items: await services.workspace.listPdfOutline(relativePath) };
    },

    'workspace:cd': (arg) => {
      const { path: nextPath } = arg as { path: string };
      const root = services.workspace.setRoot(nextPath);
      const recent = recordRecentWorkspace(root);
      return {
        root,
        paths: services.workspace.listChildren(''),
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

    'ai:translate': (arg) => {
      const { sentence } = arg as { sentence: string };
      return services.openai.translate(sentence);
    },

    'search:start': async (arg, event) => {
      const { searchId, command, query } = arg as {
        searchId: number;
        command: 'rg' | 'fd';
        query: string;
      };
      const sender = (event as { sender: WebContents }).sender;

      cancelSearch(searchId);

      const emit = {
        onMatch: (match: ShellSearchMatch) => {
          sendSearchEvent(sender, { searchId, type: 'match', match });
        },
        onError: (error: ShellSearchError) => {
          sendSearchEvent(sender, { searchId, type: 'error', error });
        },
        onDone: () => {
          activeSearches.delete(searchId);
          sendSearchEvent(sender, { searchId, type: 'done' });
        },
      };

      const workspaceRoot = services.workspace.getRoot();
      const tools = services.config.get().tools;
      const started =
        command === 'rg'
          ? await streamRgSearch(workspaceRoot, query, emit, tools)
          : await streamFdSearch(workspaceRoot, query, emit, tools);

      if ('code' in started) {
        return { ok: false as const, error: started };
      }

      activeSearches.set(searchId, started);
      return { ok: true as const };
    },

    'search:cancel': (arg) => {
      const { searchId } = arg as { searchId: number };
      cancelSearch(searchId);
      return { ok: true };
    },
  };

  (Object.keys(handlers) as IpcChannel[]).forEach((channel) => {
    ipcMain.handle(channel, async (event, arg) => {
      if (channel === 'search:start') {
        return handlers[channel](arg, event);
      }
      return handlers[channel](arg);
    });
  });
}

export function registerThemeWatcher(
  services: MuledServices,
  getWindow: () => BrowserWindow | null,
): void {
  nativeTheme.on('updated', () => {
    const win = getWindow();
    if (!win) return;
    sendThemeChanged(win, services.config);
  });
}
