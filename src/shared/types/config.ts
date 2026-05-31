import type { EditorFontSettings } from '../editorFontConfig';
import type { ResolvedThemeConfig, ThemeConfig } from './theme';

export type { EditorFontSettings };
export type { ResolvedThemeConfig, ThemeConfig, ThemePreference, ResolvedTheme } from './theme';

export type EditorMode = 'vim' | 'normal';
export type EditorViewMode = 'source' | 'rich-text';

export interface MuledConfig {
  openai: {
    api_key: string;
    model: string;
    base_url: string | null;
  };
  editor: {
    buffer_bytes: number;
    mode: EditorMode;
    default_view: EditorViewMode | null;
    source: EditorFontSettings;
    wysiwyg: EditorFontSettings;
  };
  workspace: {
    path: string;
  };
  ui: {
    sidebar_width: number;
    /** @pierre/trees initialExpansion：非负整数，表示默认展开的目录深度 */
    tree_initial_expansion_depth: number;
  };
  theme: ThemeConfig;
}

export interface PublicConfig {
  editor: MuledConfig['editor'] & {
    default_view: EditorViewMode;
  };
  workspace: MuledConfig['workspace'];
  ui: MuledConfig['ui'];
  theme: ThemeConfig & {
    resolved: ResolvedThemeConfig;
  };
  openai: {
    model: string;
    has_api_key: boolean;
  };
  system: {
    homedir: string;
  };
}
