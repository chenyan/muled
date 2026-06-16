import { EditorView } from '@codemirror/view';
import type { Extension } from '@codemirror/state';

/** 括号匹配：仅背景高亮，去掉主题自带的 outline 黑框 */
export function codeMirrorBracketMatchThemeFix(): Extension {
  return EditorView.theme({
    '&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket': {
      outline: 'none',
      border: 'none',
      boxShadow: 'none',
    },
  });
}
