import type { EditorFontSettings } from '../editorFontConfig';

export type { EditorFontSettings };

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
}

export interface PublicConfig {
  editor: MuledConfig['editor'] & {
    default_view: EditorViewMode;
  };
  workspace: MuledConfig['workspace'];
  ui: MuledConfig['ui'];
  openai: {
    model: string;
    has_api_key: boolean;
  };
  system: {
    homedir: string;
  };
}
