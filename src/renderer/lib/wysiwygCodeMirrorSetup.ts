import { EditorView } from '@codemirror/view';
import { basicDark } from 'cm6-theme-basic-dark';
import { basicLight } from 'cm6-theme-basic-light';
import type { Extension } from '@codemirror/state';
import languageExtensionForId from './codemirrorLanguage';
import type { SourceLanguageId } from './fileLanguage';
import type { WysiwygTheme } from '../hooks/useWysiwygStyles';

export function buildWysiwygCodeBlockExtensions(
  languageId: SourceLanguageId,
  theme: WysiwygTheme,
): Extension[] {
  const lang = languageExtensionForId(languageId);
  return [
    theme === 'dark' ? basicDark : basicLight,
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
