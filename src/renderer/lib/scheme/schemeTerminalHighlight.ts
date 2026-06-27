import { parser } from './lezer-scheme/parser.js';
import {
  BooleanToken,
  Character,
  Keyword,
  LineComment,
  Number,
  String,
  Symbol,
} from './lezer-scheme/parser.terms.js';
import { isSchemeTerminalKeyword } from './schemeTerminalKeywords';

export interface SchemeTerminalHighlightSpan {
  from: number;
  to: number;
  className: string;
}

const HIGHLIGHT_CLASS_BY_TERM: Record<number, string> = {
  [LineComment]: 'SchemeTerminalPane__hl-comment',
  [BooleanToken]: 'SchemeTerminalPane__hl-boolean',
  [Number]: 'SchemeTerminalPane__hl-number',
  [String]: 'SchemeTerminalPane__hl-string',
  [Character]: 'SchemeTerminalPane__hl-string',
  [Keyword]: 'SchemeTerminalPane__hl-keyword',
  [Symbol]: 'SchemeTerminalPane__hl-symbol',
};

function collectHighlightSpans(source: string): SchemeTerminalHighlightSpan[] {
  if (!source.trim()) return [];
  const tree = parser.parse(source);
  const spans: SchemeTerminalHighlightSpan[] = [];

  tree.iterate({
    enter(node) {
      let className = HIGHLIGHT_CLASS_BY_TERM[node.type.id];
      if (node.type.id === Symbol) {
        const text = source.slice(node.from, node.to);
        if (isSchemeTerminalKeyword(text)) {
          className = 'SchemeTerminalPane__hl-keyword';
        }
      }
      if (!className) return;
      const from = node.from;
      const to = node.to;
      if (from >= to) return;
      spans.push({ from, to, className });
    },
  });

  spans.sort((a, b) => a.from - b.from || a.to - b.to);
  return spans;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildHighlightedInputHtmlSimple(
  input: string,
  spans: SchemeTerminalHighlightSpan[],
  cursorColInInput: number,
): string {
  if (!input) {
    return cursorColInInput === 0
      ? '<span class="term-cursor"> </span>'
      : '';
  }

  const parts: string[] = [];
  let pos = 0;

  const pushSegment = (from: number, to: number, className?: string) => {
    if (from >= to) return;
    const text = input.slice(from, to);
    if (cursorColInInput >= from && cursorColInInput < to) {
      const offset = cursorColInInput - from;
      const before = text.slice(0, offset);
      const cursorChar = text[offset] ?? ' ';
      const after = text.slice(offset + 1);
      if (before) {
        parts.push(
          className
            ? `<span class="${className}">${escapeHtml(before)}</span>`
            : `<span>${escapeHtml(before)}</span>`,
        );
      }
      parts.push(
        className
          ? `<span class="term-cursor ${className}">${escapeHtml(cursorChar)}</span>`
          : `<span class="term-cursor">${escapeHtml(cursorChar)}</span>`,
      );
      if (after) {
        parts.push(
          className
            ? `<span class="${className}">${escapeHtml(after)}</span>`
            : `<span>${escapeHtml(after)}</span>`,
        );
      }
      return;
    }
    parts.push(
      className
        ? `<span class="${className}">${escapeHtml(text)}</span>`
        : `<span>${escapeHtml(text)}</span>`,
    );
  };

  for (const span of spans) {
    pushSegment(pos, span.from);
    pushSegment(span.from, span.to, span.className);
    pos = span.to;
  }
  pushSegment(pos, input.length);

  if (cursorColInInput === input.length) {
    parts.push('<span class="term-cursor"> </span>');
  }

  return parts.join('');
}

export function buildSchemeInputLineHtml(
  promptText: string,
  input: string,
  cursorColInInput: number,
): string {
  const spans = collectHighlightSpans(input);
  const promptHtml = `<span>${escapeHtml(promptText)}</span>`;
  const inputHtml = buildHighlightedInputHtmlSimple(
    input,
    spans,
    cursorColInInput,
  );
  return promptHtml + inputHtml;
}

export function applySchemeInputLineHighlight(
  rowEl: HTMLElement,
  promptLen: number,
  input: string,
  cursorColInInput: number,
  cols: number,
): void {
  if (!input) return;

  const promptText = rowEl.textContent?.slice(0, promptLen) ?? '> ';
  const html = buildSchemeInputLineHtml(promptText, input, cursorColInInput);

  const trailingSpaces = Math.max(0, cols - promptLen - input.length);
  const paddedHtml =
    html + (trailingSpaces > 0 ? `<span>${' '.repeat(trailingSpaces)}</span>` : '');

  rowEl.innerHTML = paddedHtml;
  rowEl.dataset.schemeInputHighlighted = '1';
}
