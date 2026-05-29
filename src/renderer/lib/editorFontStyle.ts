import type { CSSProperties } from 'react';
import type { EditorFontSettings } from '../../shared/editorFontConfig';

export function editorPaneFontVars(
  source: EditorFontSettings,
  wysiwyg: EditorFontSettings,
): CSSProperties {
  return {
    '--muled-source-font-family': source.font_family,
    '--muled-source-font-size': `${source.font_size}px`,
    '--muled-wysiwyg-font-family': wysiwyg.font_family,
    '--muled-wysiwyg-font-size': `${wysiwyg.font_size}px`,
  } as CSSProperties;
}
