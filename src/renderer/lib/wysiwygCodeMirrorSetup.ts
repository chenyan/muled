import { EditorView } from '@codemirror/view';
import type { Extension } from '@codemirror/state';
import languageExtensionForId from './codemirrorLanguage';
import { flattenExtensions } from './codemirrorSetup';
import { codeMirrorThemeFor } from './codemirrorThemeFor';
import type { SourceLanguageId } from './fileLanguage';
import type { WysiwygTheme } from '../hooks/useWysiwygStyles';

export function buildWysiwygCodeBlockExtensions(
  languageId: SourceLanguageId,
  theme: WysiwygTheme,
): Extension[] {
  const lang = languageExtensionForId(languageId);
  return [
    ...flattenExtensions([codeMirrorThemeFor(theme)]),
    EditorView.lineWrapping,
    EditorView.theme({
      '&': { height: 'auto', backgroundColor: 'transparent' },
      '.cm-scroller': { overflow: 'visible' },
      '.cm-gutters': { display: 'none' },
      '.cm-content': { minHeight: '96px' },
    }),
    ...(lang ? [lang] : []),
  ];
}
