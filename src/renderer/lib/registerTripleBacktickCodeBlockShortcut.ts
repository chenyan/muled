import { $createCodeBlockNode } from '@mdxeditor/editor';
import {
  $getNodeByKey,
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  $isRootOrShadowRoot,
  $isTextNode,
  COLLABORATION_TAG,
  HISTORIC_TAG,
  type LexicalEditor,
} from 'lexical';

/** 行首 ``` 或 ```lang（无需尾随空格） */
export const TRIPLE_BACKTICK_LINE_RE = /^[ \t]*```([\w-]*)$/;

export function matchTripleBacktickLine(
  textContent: string,
  anchorOffset: number,
): RegExpMatchArray | null {
  const match = textContent.match(TRIPLE_BACKTICK_LINE_RE);
  if (!match) {
    return null;
  }
  const matchedLength = match[0].endsWith(' ')
    ? match[0].length
    : match[0].length;
  if (anchorOffset !== matchedLength) {
    return null;
  }
  return match;
}

export function registerTripleBacktickCodeBlockShortcut(
  editor: LexicalEditor,
  defaultLanguage = 'txt',
): () => void {
  return editor.registerUpdateListener(
    ({ tags, dirtyLeaves, editorState, prevEditorState }) => {
      if (tags.has(COLLABORATION_TAG) || tags.has(HISTORIC_TAG)) {
        return;
      }
      if (tags.has('triple-backtick-code-block')) {
        return;
      }
      if (editor.isComposing()) {
        return;
      }

      const selection = editorState.read($getSelection);
      const prevSelection = prevEditorState.read($getSelection);
      if (!$isRangeSelection(prevSelection) || !$isRangeSelection(selection)) {
        return;
      }
      if (!selection.isCollapsed() || selection.is(prevSelection)) {
        return;
      }

      const anchorKey = selection.anchor.key;
      const anchorOffset = selection.anchor.offset;
      if (
        anchorOffset !== 1 &&
        anchorOffset > prevSelection.anchor.offset + 1
      ) {
        return;
      }
      if (!dirtyLeaves.has(anchorKey)) {
        return;
      }

      const language = editorState.read(() => {
        const anchorNode = $getNodeByKey(anchorKey);
        if (!$isTextNode(anchorNode)) {
          return null;
        }

        const match = matchTripleBacktickLine(
          anchorNode.getTextContent(),
          anchorOffset,
        );
        if (!match) {
          return null;
        }

        const parentNode = anchorNode.getParent();
        if (parentNode === null || !$isParagraphNode(parentNode)) {
          return null;
        }
        const grandParent = parentNode.getParent();
        if (
          !$isRootOrShadowRoot(grandParent) ||
          parentNode.getFirstChild() !== anchorNode
        ) {
          return null;
        }

        return match[1] || defaultLanguage;
      });

      if (language === null) {
        return;
      }

      editor.update(
        () => {
          const anchorNode = $getNodeByKey(anchorKey);
          if (!$isTextNode(anchorNode)) {
            return;
          }
          const parentNode = anchorNode.getParent();
          if (!parentNode || !$isParagraphNode(parentNode)) {
            return;
          }

          const codeBlockNode = $createCodeBlockNode({
            code: '',
            language,
            meta: '',
          });
          parentNode.selectPrevious();
          parentNode.replace(codeBlockNode);
          setTimeout(() => {
            codeBlockNode.select();
          }, 80);
        },
        { tag: 'triple-backtick-code-block' },
      );
    },
  );
}
