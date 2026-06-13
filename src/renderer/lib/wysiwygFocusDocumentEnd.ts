import {
  $createParagraphNode,
  $getRoot,
  $isParagraphNode,
  type LexicalEditor,
} from 'lexical';
import { getWysiwygContentRoot } from './wysiwygContentRoot';

type LexicalRootElement = HTMLElement & {
  __lexicalEditor?: LexicalEditor;
};

function getLexicalEditor(host: HTMLElement): LexicalEditor | null {
  const contentRoot = getWysiwygContentRoot(host) as LexicalRootElement | null;
  return contentRoot?.__lexicalEditor ?? null;
}

function getWysiwygTopLevelBlocks(contentRoot: HTMLElement): HTMLElement[] {
  return Array.from(contentRoot.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement,
  );
}

/** 点击位置是否在正文最后一个块级元素下方 */
export function isPointerBelowWysiwygContent(
  host: HTMLElement,
  clientY: number,
): boolean {
  const contentRoot = getWysiwygContentRoot(host);
  if (!contentRoot) {
    return false;
  }

  const blocks = getWysiwygTopLevelBlocks(contentRoot);
  if (blocks.length === 0) {
    const rect = contentRoot.getBoundingClientRect();
    return clientY >= rect.top;
  }

  const lastRect = blocks[blocks.length - 1].getBoundingClientRect();
  return clientY > lastRect.bottom + 2;
}

function shouldIgnoreEndClick(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return true;
  }

  if (
    target.closest(
      'a, button, input, textarea, select, [data-editor-block-type="image"]',
    )
  ) {
    return true;
  }

  if (
    target.closest(
      '.MuledCodeBlockWithPreview__textarea, .MnoteEntryCodeBlockEditor__quote, .MnoteEntryCodeBlockEditor__body',
    )
  ) {
    return true;
  }

  return false;
}

/** 在文末追加空段落并聚焦；若末尾已是空段落则直接聚焦 */
export function focusWysiwygAtDocumentEnd(host: HTMLElement): {
  focused: boolean;
  appended: boolean;
} {
  const contentRoot = getWysiwygContentRoot(host);
  if (!contentRoot || contentRoot.getAttribute('contenteditable') === 'false') {
    return { focused: false, appended: false };
  }

  const editor = getLexicalEditor(host);
  if (!editor) {
    return { focused: false, appended: false };
  }

  let appended = false;
  editor.update(() => {
    const root = $getRoot();
    const lastChild = root.getLastChild();

    if (
      lastChild &&
      $isParagraphNode(lastChild) &&
      lastChild.getChildrenSize() === 0
    ) {
      lastChild.selectStart();
      return;
    }

    appended = true;
    const paragraph = $createParagraphNode();
    root.append(paragraph);
    paragraph.selectStart();
  });
  editor.focus();
  return { focused: true, appended };
}

/** 在 scroll host 上安装「尾行下方点击续写」行为 */
export function handleWysiwygClickBelowContent(
  host: HTMLElement,
  event: PointerEvent,
  onInserted?: () => void,
): boolean {
  if (event.button !== 0 || event.defaultPrevented) {
    return false;
  }
  if (shouldIgnoreEndClick(event.target)) {
    return false;
  }
  if (!isPointerBelowWysiwygContent(host, event.clientY)) {
    return false;
  }

  const result = focusWysiwygAtDocumentEnd(host);
  if (!result.focused) {
    return false;
  }

  if (result.appended) {
    onInserted?.();
  }
  event.preventDefault();
  return true;
}
