import { ipcMain, nativeTheme, shell, type BrowserWindow, type WebContents } from 'electron';
import fs from 'fs';
import type {
  ConfigChangedPayload,
  IpcChannel,
  ThemeChangedPayload,
} from '../../shared/types/ipc';
import { didWorkspacePathChange } from '../../shared/configChange';
import { getConfigFilePath, getWysiwygStyleDir } from '../../shared/pathUtils';
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
  loadWorkspaceHistory,
  recordRecentWorkspace,
  removeWorkspaceFromHistory,
  setWorkspacePinned,
} from '../services/recentWorkspacesService';
import { listCdPathCompletionLabels } from '../services/cdPathCompletionService';
import {
  streamFdSearch,
  streamRgSearch,
  type RunningSearch,
} from '../services/shellSearchService';
import WorkspaceService from '../services/workspaceService';
import WorkspaceWatcherService from '../services/workspaceWatcherService';
import { detectToolPaths, resolveToolExecutable } from '../services/toolPathService';
import { runSchemeScript } from '../services/schemeRunService';
import DuckdbService from '../services/duckdbService';
import DuckdbFileService from '../services/duckdbFileService';
import SqliteService from '../services/sqliteService';

export interface MuledServices {
  config: ConfigService;
  workspace: WorkspaceService;
  file: FileService;
  openai: OpenAIService;
  duckdb: DuckdbService;
  duckdbFile: DuckdbFileService;
  sqlite: SqliteService;
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
  const duckdb = new DuckdbService();
  const duckdbFile = new DuckdbFileService();
  const sqlite = new SqliteService();
  return { config, workspace, file, openai, duckdb, duckdbFile, sqlite };
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

function sendConfigChanged(
  win: BrowserWindow,
  payload: ConfigChangedPayload,
): void {
  if (win.isDestroyed()) return;
  win.webContents.send('config:changed', payload);
}

function notifyConfigUpdate(
  win: BrowserWindow,
  services: MuledServices,
  payload: ConfigChangedPayload,
): void {
  sendThemeChanged(win, services.config);
  sendConfigChanged(win, payload);
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

let workspaceWatcher: WorkspaceWatcherService | null = null;

function syncWorkspaceWatcherRoot(services: MuledServices): void {
  workspaceWatcher?.watch(services.workspace.getRoot());
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
      const result = services.config.saveSettings(settings);
      if (result.workspacePathChanged) {
        const nextRoot = services.config.get().workspace.path;
        try {
          services.workspace.setRoot(nextRoot);
          syncWorkspaceWatcherRoot(services);
        } catch {
          /* 工作区路径无效时保留当前根目录，仅更新配置文件 */
        }
      }
      const win = getWindow?.();
      if (win) {
        sendThemeChanged(win, services.config);
      }
      return result;
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

    'workspace:exists': (arg) => {
      const { path: relativePath } = arg as { path: string };
      return { exists: services.workspace.pathExists(relativePath) };
    },

    'workspace:createFile': (arg) => {
      const { path: relativePath } = arg as { path: string };
      return { path: services.workspace.createFile(relativePath) };
    },

    'workspace:createDirectory': (arg) => {
      const { path: relativePath } = arg as { path: string };
      return { path: services.workspace.createDirectory(relativePath) };
    },

    'workspace:rename': (arg) => {
      const { from, to } = arg as { from: string; to: string };
      return { path: services.workspace.renamePath(from, to) };
    },

    'workspace:delete': (arg) => {
      const { path: relativePath } = arg as { path: string };
      services.workspace.deletePath(relativePath);
      return { ok: true };
    },

    'workspace:pdfOutline': async (arg) => {
      const { path: relativePath } = arg as { path: string };
      return { items: await services.workspace.listPdfOutline(relativePath) };
    },

    'workspace:cd': (arg) => {
      const { path: nextPath } = arg as { path: string };
      const root = services.workspace.setRoot(nextPath);
      syncWorkspaceWatcherRoot(services);
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

    'workspace:getHistory': () => loadWorkspaceHistory(),

    'workspace:removeFromHistory': (arg) => {
      const { path: workspacePath } = arg as { path: string };
      return removeWorkspaceFromHistory(workspacePath);
    },

    'workspace:setPinned': (arg) => {
      const { path: workspacePath, pinned } = arg as {
        path: string;
        pinned: boolean;
      };
      return setWorkspacePinned(workspacePath, pinned);
    },

    'file:read': (arg) => {
      const { path: filePath } = arg as { path: string };
      return services.file.read(filePath);
    },

    'file:readBinary': (arg) => {
      const { path: filePath } = arg as { path: string };
      return services.file.readBinary(filePath);
    },

    'file:readBinaryBuffer': (arg) => {
      const { path: filePath } = arg as { path: string };
      return services.file.readBinaryBuffer(filePath);
    },

    'file:write': (arg) => {
      const { path: filePath, content } = arg as {
        path: string;
        content: string;
      };
      return services.file.write(filePath, content);
    },

    'file:writeBinary': (arg) => {
      const { path: filePath, base64 } = arg as {
        path: string;
        base64: string;
      };
      return services.file.writeBinary(filePath, base64);
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

    'shell:openExternal': async (arg) => {
      const { url } = arg as { url: string };
      await shell.openExternal(url);
      return { ok: true };
    },

    'csv:register': async (arg) => {
      const { sessionId, content } = arg as {
        sessionId: string;
        content: string;
      };
      return services.duckdb.registerCsv({ sessionId, content });
    },

    'csv:query': (arg) => {
      const { sessionId, sql } = arg as { sessionId: string; sql: string };
      return services.duckdb.query({ sessionId, sql });
    },

    'csv:close': async (arg) => {
      const { sessionId } = arg as { sessionId: string };
      await services.duckdb.closeSession(sessionId);
      return { ok: true };
    },

    'sqlite:open': (arg) => {
      const { sessionId, path: relativePath } = arg as {
        sessionId: string;
        path: string;
      };
      const absolutePath = services.file.resolveFilePath(relativePath);
      return services.sqlite.open({ sessionId, absolutePath });
    },

    'sqlite:query': (arg) => {
      const { sessionId, sql } = arg as { sessionId: string; sql: string };
      return services.sqlite.query({ sessionId, sql });
    },

    'sqlite:listTables': (arg) => {
      const { sessionId } = arg as { sessionId: string };
      return services.sqlite.listTables(sessionId);
    },

    'sqlite:close': (arg) => {
      const { sessionId } = arg as { sessionId: string };
      services.sqlite.closeSession(sessionId);
      return { ok: true };
    },

    'duckdbFile:open': async (arg) => {
      const { sessionId, path: relativePath } = arg as {
        sessionId: string;
        path: string;
      };
      const absolutePath = services.file.resolveFilePath(relativePath);
      return services.duckdbFile.open({ sessionId, absolutePath });
    },

    'duckdbFile:query': async (arg) => {
      const { sessionId, sql } = arg as { sessionId: string; sql: string };
      return services.duckdbFile.query({ sessionId, sql });
    },

    'duckdbFile:listTables': async (arg) => {
      const { sessionId } = arg as { sessionId: string };
      return services.duckdbFile.listTables(sessionId);
    },

    'duckdbFile:close': async (arg) => {
      const { sessionId } = arg as { sessionId: string };
      await services.duckdbFile.closeSession(sessionId);
      return { ok: true };
    },

    'scheme:run': (arg) => {
      const { code } = arg as { code: string };
      const chez = resolveToolExecutable(
        'chez',
        services.config.get().tools.chez,
      );
      if (!chez) {
        return { error: 'not_configured' as const };
      }
      const result = runSchemeScript(chez, code);
      return { ok: true as const, ...result };
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

export function registerWorkspaceWatcher(
  services: MuledServices,
  getWindow: () => BrowserWindow | null,
): void {
  workspaceWatcher = new WorkspaceWatcherService();
  workspaceWatcher.setOnChange(() => {
    const win = getWindow();
    if (!win || win.isDestroyed()) {
      return;
    }
    win.webContents.send('workspace:filesystemChanged');
  });
  syncWorkspaceWatcherRoot(services);
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

function debounce(fn: () => void, ms: number): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return () => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(fn, ms);
  };
}

/** 监听配置文件与 WYSIWYG 样式变更，热更新或按需重载工作区 */
export function registerConfigWatcher(
  services: MuledServices,
  getWindow: () => BrowserWindow | null,
): void {
  let suppressWatchUntil = 0;
  services.config.setOnBeforePersist(() => {
    suppressWatchUntil = Date.now() + 500;
  });

  const reloadFromConfigFile = debounce(() => {
    if (Date.now() < suppressWatchUntil) {
      return;
    }
    const win = getWindow();
    if (!win || win.isDestroyed()) {
      return;
    }

    const previousWorkspacePath = services.config.get().workspace.path;
    services.config.load();
    const nextWorkspacePath = services.config.get().workspace.path;
    const workspacePathChanged = didWorkspacePathChange(
      previousWorkspacePath,
      nextWorkspacePath,
    );

    if (workspacePathChanged) {
      try {
        services.workspace.setRoot(nextWorkspacePath);
        syncWorkspaceWatcherRoot(services);
      } catch {
        /* 无效路径时保留当前工作区 */
      }
    }

    notifyConfigUpdate(win, services, {
      config: services.config.getPublicConfig(),
      workspacePathChanged,
    });
  }, 200);

  const reloadWysiwygStyles = debounce(() => {
    if (Date.now() < suppressWatchUntil) {
      return;
    }
    const win = getWindow();
    if (!win || win.isDestroyed()) {
      return;
    }
    sendThemeChanged(win, services.config);
  }, 200);

  const configPath = getConfigFilePath();
  if (fs.existsSync(configPath)) {
    fs.watch(configPath, () => {
      reloadFromConfigFile();
    });
  }

  const wysiwygDir = getWysiwygStyleDir();
  if (fs.existsSync(wysiwygDir)) {
    fs.watch(wysiwygDir, (_event, filename) => {
      if (typeof filename === 'string' && filename.endsWith('.css')) {
        reloadWysiwygStyles();
      }
    });
  }
}
