import { DEFAULT_SOURCE_FONT, DEFAULT_WYSIWYG_FONT } from './editorFontConfig';
import type { PublicConfig } from './types/config';
import { DEFAULT_THEME_CONFIG } from './types/theme';

/** 配置尚未从主进程返回时，用于先渲染完整 UI 壳层 */
export const DEFAULT_PUBLIC_CONFIG: PublicConfig = {
  editor: {
    buffer_bytes: 16 * 1024 * 1024,
    mode: 'vim',
    default_view: 'source',
    source: DEFAULT_SOURCE_FONT,
    wysiwyg: DEFAULT_WYSIWYG_FONT,
  },
  workspace: { path: '' },
  ui: { sidebar_width: 260, tree_initial_expansion_depth: 1 },
  theme: {
    ...DEFAULT_THEME_CONFIG,
    resolved: { ui: 'light', wysiwyg: 'light', source: 'light' },
  },
  openai: { model: 'gpt-4o-mini', has_api_key: false },
  system: { homedir: '' },
};
