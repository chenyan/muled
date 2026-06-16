import {
  closeBrackets,
  closeBracketsKeymap,
} from '@codemirror/autocomplete';
import { defaultKeymap } from '@codemirror/commands';
import { indentOnInput, bracketMatching } from '@codemirror/language';
import { Prec, type Extension } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { buildCodeEditorIndentExtensions } from './codemirrorIndentExtension';
import { codeMirrorBracketMatchThemeFix } from './codemirrorBracketMatchTheme';
import languageExtensionForId from './codemirrorLanguage';
import { flattenExtensions } from './codemirrorSetup';
import { codeMirrorThemeFor } from './codemirrorThemeFor';
import type { SourceLanguageId } from './fileLanguage';
import type { WysiwygTheme } from '../../shared/pathUtils';
import type { EditorIndentSettings } from '../../shared/editorIndentConfig';
import { DEFAULT_EDITOR_INDENT } from '../../shared/editorIndentConfig';

/** WYSIWYG 内嵌代码块：Enter/Tab/括号等编辑行为（含语言智能缩进） */
function buildWysiwygCodeBlockEditingExtensions(
  indent: EditorIndentSettings,
): Extension[] {
  return [
    indentOnInput(),
    bracketMatching(),
    closeBrackets(),
    ...buildCodeEditorIndentExtensions(indent),
    Prec.high(
      keymap.of([...closeBracketsKeymap, ...defaultKeymap]),
    ),
  ];
}

export function buildWysiwygCodeBlockExtensions(
  languageId: SourceLanguageId,
  theme: WysiwygTheme,
  indent: EditorIndentSettings = DEFAULT_EDITOR_INDENT,
): Extension[] {
  const lang = languageExtensionForId(languageId);
  return [
    ...flattenExtensions([codeMirrorThemeFor(theme)]),
    codeMirrorBracketMatchThemeFix(),
    EditorView.lineWrapping,
    EditorView.theme({
      '&': { height: 'auto', backgroundColor: 'transparent' },
      '.cm-scroller': { overflow: 'visible' },
      '.cm-gutters': { display: 'none' },
      '.cm-content': { minHeight: '96px' },
    }),
    ...(lang ? [lang] : []),
    ...buildWysiwygCodeBlockEditingExtensions(indent),
  ];
}
