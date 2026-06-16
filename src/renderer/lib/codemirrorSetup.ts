import type { Extension } from '@codemirror/state';
import { EditorState } from '@codemirror/state';
import {
  crosshairCursor,
  drawSelection,
  dropCursor,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  rectangularSelection,
} from '@codemirror/view';
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import {
  bracketMatching,
  foldGutter,
  foldKeymap,
  indentOnInput,
} from '@codemirror/language';
import { lintKeymap } from '@codemirror/lint';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { EditorView } from '@codemirror/view';
import type { ResolvedTheme } from '../../shared/types/theme';
import type { EditorIndentSettings } from '../../shared/editorIndentConfig';
import { DEFAULT_EDITOR_INDENT } from '../../shared/editorIndentConfig';
import { codeMirrorThemeFor } from './codemirrorThemeFor';
import { buildCodeEditorIndentExtensions } from './codemirrorIndentExtension';
import { codeMirrorBracketMatchThemeFix } from './codemirrorBracketMatchTheme';

/**
 * 语法高亮的 bold/italic、字体连字会改变字宽，导致光标与文字错位。
 * 强制等宽渲染，仅用颜色区分 token。
 */
function sourceEditorMeasureFixExtension(): Extension {
  return EditorView.theme({
    '.cm-scroller': {
      lineHeight: 1.5,
    },
    '.cm-content': {
      fontVariantLigatures: 'none',
      fontFeatureSettings: '"liga" 0, "calt" 0',
      padding: '4px 0',
    },
    '.cm-line': {
      padding: '0 2px 0 6px',
    },
    '.cm-content .cm-line span': {
      fontWeight: 'inherit !important',
      fontStyle: 'inherit !important',
    },
  });
}

/**
 * 等同 codemirror 包的 basicSetup，但不含 defaultHighlightStyle（由主题提供），
 * 且 lineNumbers 只注册一次。
 */
function sourceEditorSetup(): Extension[] {
  return [
    lineNumbers(),
    highlightActiveLineGutter(),
    highlightSpecialChars(),
    history(),
    foldGutter(),
    drawSelection(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    bracketMatching(),
    closeBrackets(),
    autocompletion(),
    rectangularSelection(),
    crosshairCursor(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    keymap.of([
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
      ...foldKeymap,
      ...completionKeymap,
      ...lintKeymap,
    ]),
  ];
}

/** 将 CodeMirror 扩展或扩展数组合并为一维数组，过滤 undefined */
export function flattenExtensions(
  parts: Array<Extension | readonly Extension[] | undefined | null>,
): Extension[] {
  return parts.reduce<Extension[]>((acc, part) => {
    if (part == null) return acc;
    if (Array.isArray(part)) return acc.concat([...part]);
    return acc.concat([part]);
  }, []);
}

/** Source 编辑器通用 UI 扩展（主题、行号等） */
export function buildCommonSourceUiExtensions(
  theme: ResolvedTheme = 'light',
  indent: EditorIndentSettings = DEFAULT_EDITOR_INDENT,
): Extension[] {
  return flattenExtensions([
    sourceEditorSetup(),
    buildCodeEditorIndentExtensions(indent),
    codeMirrorThemeFor(theme),
    codeMirrorBracketMatchThemeFix(),
    sourceEditorMeasureFixExtension(),
  ]);
}
