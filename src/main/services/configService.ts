import fs from 'fs';
import os from 'os';
import yaml from 'js-yaml';
import type {
  EditorMode,
  EditorViewMode,
  MuledConfig,
  PublicConfig,
} from '../../shared/types/config';
import {
  DEFAULT_BUFFER_BYTES,
  DEFAULT_TREE_INITIAL_EXPANSION_DEPTH,
} from '../../shared/constants';
import {
  DEFAULT_SOURCE_FONT,
  DEFAULT_WYSIWYG_FONT,
  parseEditorFontSettings,
} from '../../shared/editorFontConfig';
import type { SettingsForm, SettingsGetResult } from '../../shared/types/settings';
import {
  DEFAULT_TOOL_PATHS,
  parseToolPaths,
} from '../../shared/types/tools';
import {
  DEFAULT_THEME_CONFIG,
  parseThemeConfig,
} from '../../shared/types/theme';
import { resolveThemes } from './themeService';
import {
  compressTilde,
  ensureParentDir,
  expandTilde,
  getConfigFilePath,
  resolvePath,
} from '../../shared/pathUtils';

const DEFAULT_CONFIG: MuledConfig = {
  openai: {
    api_key: '',
    model: 'gpt-4o-mini',
    base_url: null,
  },
  editor: {
    buffer_bytes: DEFAULT_BUFFER_BYTES,
    mode: 'vim',
    default_view: null,
    source: DEFAULT_SOURCE_FONT,
    wysiwyg: DEFAULT_WYSIWYG_FONT,
  },
  workspace: {
    path: os.homedir(),
  },
  ui: {
    sidebar_width: 260,
    tree_initial_expansion_depth: DEFAULT_TREE_INITIAL_EXPANSION_DEPTH,
  },
  theme: DEFAULT_THEME_CONFIG,
  tools: { ...DEFAULT_TOOL_PATHS },
};

function parseTreeInitialExpansionDepth(value: unknown): number {
  if (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0
  ) {
    return value;
  }
  return DEFAULT_TREE_INITIAL_EXPANSION_DEPTH;
}

function deriveDefaultView(
  mode: EditorMode,
  explicit: EditorViewMode | null,
): EditorViewMode {
  if (explicit === 'source' || explicit === 'rich-text') {
    return explicit;
  }
  return mode === 'vim' ? 'source' : 'rich-text';
}

function parseConfig(raw: unknown): MuledConfig {
  const data = (raw && typeof raw === 'object' ? raw : {}) as Record<
    string,
    unknown
  >;
  const openai = (data.openai ?? {}) as Record<string, unknown>;
  const editor = (data.editor ?? {}) as Record<string, unknown>;
  const workspace = (data.workspace ?? {}) as Record<string, unknown>;
  const ui = (data.ui ?? {}) as Record<string, unknown>;
  const theme = parseThemeConfig(data.theme);

  const mode =
    editor.mode === 'normal' || editor.mode === 'vim' ? editor.mode : 'vim';
  const defaultView =
    editor.default_view === 'source' || editor.default_view === 'rich-text'
      ? editor.default_view
      : null;

  const bufferBytes =
    typeof editor.buffer_bytes === 'number' && editor.buffer_bytes > 0
      ? editor.buffer_bytes
      : DEFAULT_BUFFER_BYTES;

  const workspacePath =
    typeof workspace.path === 'string' && workspace.path.length > 0
      ? expandTilde(workspace.path)
      : DEFAULT_CONFIG.workspace.path;

  return {
    openai: {
      api_key: typeof openai.api_key === 'string' ? openai.api_key : '',
      model:
        typeof openai.model === 'string' && openai.model.length > 0
          ? openai.model
          : DEFAULT_CONFIG.openai.model,
      base_url: typeof openai.base_url === 'string' ? openai.base_url : null,
    },
    editor: {
      buffer_bytes: bufferBytes,
      mode,
      default_view: defaultView,
      source: parseEditorFontSettings(editor.source, DEFAULT_SOURCE_FONT),
      wysiwyg: parseEditorFontSettings(editor.wysiwyg, DEFAULT_WYSIWYG_FONT),
    },
    workspace: {
      path: workspacePath,
    },
    ui: {
      sidebar_width:
        typeof ui.sidebar_width === 'number' && ui.sidebar_width > 0
          ? ui.sidebar_width
          : DEFAULT_CONFIG.ui.sidebar_width,
      tree_initial_expansion_depth: parseTreeInitialExpansionDepth(
        ui.tree_initial_expansion_depth,
      ),
    },
    theme,
    tools: parseToolPaths(data.tools),
  };
}

export function ensureConfigFile(): void {
  const configPath = getConfigFilePath();
  if (fs.existsSync(configPath)) {
    return;
  }
  ensureParentDir(configPath);
  const template = yaml.dump({
    openai: {
      api_key: '',
      model: 'gpt-4o-mini',
      base_url: null,
    },
    editor: {
      buffer_bytes: DEFAULT_BUFFER_BYTES,
      mode: 'vim',
      default_view: 'source',
      source: DEFAULT_SOURCE_FONT,
      wysiwyg: DEFAULT_WYSIWYG_FONT,
    },
    workspace: {
      path: '~/projects',
    },
    ui: {
      sidebar_width: 260,
      tree_initial_expansion_depth: DEFAULT_TREE_INITIAL_EXPANSION_DEPTH,
    },
    theme: DEFAULT_THEME_CONFIG,
    tools: DEFAULT_TOOL_PATHS,
  });
  fs.writeFileSync(configPath, template, 'utf8');
}

export default class ConfigService {
  private config: MuledConfig = DEFAULT_CONFIG;

  load(): MuledConfig {
    const configPath = getConfigFilePath();
    if (!fs.existsSync(configPath)) {
      this.config = {
        ...DEFAULT_CONFIG,
        workspace: {
          path: resolvePath(DEFAULT_CONFIG.workspace.path),
        },
      };
      return this.config;
    }

    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = parseConfig(yaml.load(raw));
    this.config = {
      ...parsed,
      workspace: {
        path: resolvePath(parsed.workspace.path),
      },
    };
    return this.config;
  }

  get(): MuledConfig {
    return this.config;
  }

  getBufferBytes(): number {
    return this.config.editor.buffer_bytes;
  }

  getPublicConfig(): PublicConfig {
    const { editor, workspace, ui, openai, theme } = this.config;
    const resolved = resolveThemes(theme);
    return {
      editor: {
        buffer_bytes: editor.buffer_bytes,
        mode: editor.mode,
        default_view: deriveDefaultView(editor.mode, editor.default_view),
        source: editor.source,
        wysiwyg: editor.wysiwyg,
      },
      workspace: { path: workspace.path },
      ui,
      theme: { ...theme, resolved },
      openai: {
        model: openai.model,
        has_api_key: openai.api_key.length > 0,
      },
      system: {
        homedir: os.homedir(),
      },
    };
  }

  getSettings(): SettingsGetResult {
    const { openai, editor, workspace, ui, theme } = this.config;
    return {
      configPath: getConfigFilePath(),
      openai_key_configured: openai.api_key.length > 0,
      settings: {
        openai: {
          api_key: '',
          model: openai.model,
          base_url: openai.base_url,
        },
        editor: {
          buffer_bytes: editor.buffer_bytes,
          mode: editor.mode,
          default_view: editor.default_view,
          source: { ...editor.source },
          wysiwyg: { ...editor.wysiwyg },
        },
        workspace: {
          path: compressTilde(workspace.path),
        },
        ui: { ...ui },
        theme: { ...theme },
        tools: {
          fd: compressTilde(this.config.tools.fd),
          rg: compressTilde(this.config.tools.rg),
        },
      },
    };
  }

  saveSettings(input: SettingsForm): PublicConfig {
    const previousKey = this.config.openai.api_key;
    const parsed = parseConfig(input);
    const apiKey =
      typeof input.openai?.api_key === 'string' &&
      input.openai.api_key.trim().length > 0
        ? input.openai.api_key.trim()
        : previousKey;

    this.config = {
      ...parsed,
      openai: { ...parsed.openai, api_key: apiKey },
      workspace: {
        path: resolvePath(parsed.workspace.path),
      },
    };
    this.persist();
    return this.getPublicConfig();
  }

  private persist(): void {
    const configPath = getConfigFilePath();
    ensureParentDir(configPath);
    const { openai, editor, workspace, ui, theme } = this.config;
    const doc = {
      openai: {
        api_key: openai.api_key,
        model: openai.model,
        base_url: openai.base_url,
      },
      editor: {
        buffer_bytes: editor.buffer_bytes,
        mode: editor.mode,
        default_view: editor.default_view,
        source: editor.source,
        wysiwyg: editor.wysiwyg,
      },
      workspace: {
        path: compressTilde(workspace.path),
      },
      ui,
      theme,
      tools: {
        fd: compressTilde(this.config.tools.fd),
        rg: compressTilde(this.config.tools.rg),
      },
    };
    fs.writeFileSync(configPath, yaml.dump(doc), 'utf8');
  }
}
