const SENTENCE_TERMINATOR = /[.!?。！？…]/;

export interface WysiwygSentenceSelection {
  text: string;
  rect: DOMRect;
}

interface TextSegment {
  node: Text;
  start: number;
  end: number;
}

function caretRangeFromPoint(x: number, y: number): Range | null {
  if (document.caretRangeFromPoint) {
    return document.caretRangeFromPoint(x, y);
  }

  const doc = document as Document & {
    caretPositionFromPoint?: (
      clientX: number,
      clientY: number,
    ) => { offsetNode: Node; offset: number } | null;
  };
  const position = doc.caretPositionFromPoint?.(x, y);
  if (!position) return null;

  const range = document.createRange();
  range.setStart(position.offsetNode, position.offset);
  range.collapse(true);
  return range;
}

function findBlockElement(node: Node, root: HTMLElement): HTMLElement | null {
  let current: Node | null = node;
  while (current && current !== root) {
    if (current instanceof HTMLElement) {
      const block = current.closest(
        'p, li, h1, h2, h3, h4, h5, h6, blockquote, td, th, [data-editor-block-type]',
      );
      if (block instanceof HTMLElement && root.contains(block)) {
        return block;
      }
    }
    current = current.parentNode;
  }
  return null;
}

function collectTextSegments(block: HTMLElement): {
  text: string;
  segments: TextSegment[];
} {
  const segments: TextSegment[] = [];
  let text = '';
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    if (node instanceof Text) {
      const start = text.length;
      text += node.textContent ?? '';
      segments.push({ node, start, end: text.length });
    }
    node = walker.nextNode();
  }
  return { text, segments };
}

/** 在 block 纯文本中定位光标字符偏移 */
export function offsetInBlockText(
  block: HTMLElement,
  targetNode: Node,
  targetOffset: number,
): number | null {
  const { text, segments } = collectTextSegments(block);
  void text;
  for (const segment of segments) {
    if (segment.node === targetNode) {
      return segment.start + targetOffset;
    }
  }
  return null;
}

/** 根据纯文本偏移在 block 内构造 DOM Range */
export function rangeFromTextOffsets(
  block: HTMLElement,
  start: number,
  end: number,
): Range | null {
  const { segments } = collectTextSegments(block);
  if (segments.length === 0) return null;

  const startSegment = segments.find(
    (segment) => start >= segment.start && start <= segment.end,
  );
  const endSegment = segments.find(
    (segment) => end >= segment.start && end <= segment.end,
  );
  if (!startSegment || !endSegment) return null;

  const range = document.createRange();
  range.setStart(startSegment.node, start - startSegment.start);
  range.setEnd(endSegment.node, end - endSegment.start);
  return range;
}

/** 在文本中定位包含 index 的完整句子边界 */
export function findSentenceBounds(
  text: string,
  index: number,
): { start: number; end: number } {
  if (!text) return { start: 0, end: 0 };

  const clamped = Math.max(0, Math.min(index, text.length - 1));

  let start = clamped;
  while (start > 0) {
    const previous = text[start - 1];
    if (SENTENCE_TERMINATOR.test(previous)) break;
    start -= 1;
  }
  while (start < text.length && /\s/.test(text[start] ?? '')) {
    start += 1;
  }

  let end = clamped;
  while (end < text.length) {
    const current = text[end];
    if (current && SENTENCE_TERMINATOR.test(current)) {
      end += 1;
      break;
    }
    end += 1;
  }

  return { start, end: Math.max(start, end) };
}

export function extractSentence(text: string, index: number): string {
  const { start, end } = findSentenceBounds(text, index);
  return text.slice(start, end).trim();
}

export function getSelectionBoundingRect(): DOMRect | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return null;
  }
  return selection.getRangeAt(0).getBoundingClientRect();
}

export function applyDomRange(range: Range): void {
  const selection = window.getSelection();
  if (!selection) return;
  selection.removeAllRanges();
  selection.addRange(range);
}

function findBlockElementFromPoint(
  root: HTMLElement,
  clientX: number,
  clientY: number,
): HTMLElement | null {
  const target = document.elementFromPoint(clientX, clientY);
  if (!target || !root.contains(target)) {
    return null;
  }
  return findBlockElement(target, root);
}

function distanceToRect(rect: DOMRect, clientX: number, clientY: number): number {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  return Math.hypot(cx - clientX, cy - clientY);
}

/** readOnly 下 caretRangeFromPoint 常失败，按点击位置估算字符偏移 */
function offsetAtPointInBlock(
  block: HTMLElement,
  clientX: number,
  clientY: number,
): number | null {
  const { text } = collectTextSegments(block);
  if (!text.trim()) return null;

  const measureOffset = (index: number): number => {
    const end = Math.min(index + 1, text.length);
    const range = rangeFromTextOffsets(block, index, end);
    if (!range) return Infinity;
    return distanceToRect(range.getBoundingClientRect(), clientX, clientY);
  };

  const step = Math.max(1, Math.floor(text.length / 64));
  let bestOffset = 0;
  let bestDistance = measureOffset(0);

  for (let index = step; index <= text.length; index += step) {
    const distance = measureOffset(index);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestOffset = index;
    }
  }

  const refineStart = Math.max(0, bestOffset - step);
  const refineEnd = Math.min(text.length, bestOffset + step);
  for (let index = refineStart; index <= refineEnd; index += 1) {
    const distance = measureOffset(index);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestOffset = index;
    }
  }

  return bestOffset;
}

function resolveBlockAndOffset(
  root: HTMLElement,
  clientX: number,
  clientY: number,
): { block: HTMLElement; offset: number } | null {
  const caret = caretRangeFromPoint(clientX, clientY);
  if (caret && root.contains(caret.startContainer)) {
    const block = findBlockElement(caret.startContainer, root);
    if (block) {
      const offset = offsetInBlockText(
        block,
        caret.startContainer,
        caret.startOffset,
      );
      if (offset !== null) {
        return { block, offset };
      }
    }
  }

  const block = findBlockElementFromPoint(root, clientX, clientY);
  if (!block) return null;

  const offset = offsetAtPointInBlock(block, clientX, clientY);
  if (offset === null) return null;
  return { block, offset };
}

export function selectSentenceAtPointInRoot(
  root: HTMLElement,
  clientX: number,
  clientY: number,
): WysiwygSentenceSelection | null {
  const resolved = resolveBlockAndOffset(root, clientX, clientY);
  if (!resolved) return null;

  const { block, offset } = resolved;
  const { text } = collectTextSegments(block);
  if (!text.trim()) return null;

  const { start, end } = findSentenceBounds(text, offset);
  const sentence = text.slice(start, end).trim();
  if (!sentence) return null;

  const sentenceRange = rangeFromTextOffsets(block, start, end);
  if (!sentenceRange) return null;

  if (root.isContentEditable || root.getAttribute('contenteditable') === 'true') {
    applyDomRange(sentenceRange);
  }
  const rect = sentenceRange.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) {
    return null;
  }
  return { text: sentence, rect };
}
