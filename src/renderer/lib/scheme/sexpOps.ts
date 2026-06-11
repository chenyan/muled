import { syntaxTree } from '@codemirror/language';
import type { EditorState, TransactionSpec } from '@codemirror/state';
import type { SyntaxNode } from '@lezer/common';
import { isCollNodeName, SCHEME_COLL_DELIMS } from './schemeCollNodes';

export interface SexpRange {
  from: number;
  to: number;
  nodeName: string;
}

const ATOM_NODE_NAMES = new Set([
  'BooleanToken',
  'Number',
  'String',
  'Character',
  'Symbol',
  'Keyword',
]);

function collDelimiterAt(
  coll: SyntaxNode,
  side: 'open' | 'close',
): { from: number; to: number } {
  const spec = SCHEME_COLL_DELIMS[coll.name]!;
  if (side === 'open') {
    return { from: coll.from, to: coll.from + spec.openLen };
  }
  return { from: coll.to - spec.closeLen, to: coll.to };
}

function isCollDelimiterNode(node: SyntaxNode, coll: SyntaxNode): boolean {
  const open = collDelimiterAt(coll, 'open');
  const close = collDelimiterAt(coll, 'close');
  return (
    (node.from === open.from && node.to === open.to) ||
    (node.from === close.from && node.to === close.to)
  );
}

export function expressionChildren(coll: SyntaxNode): SyntaxNode[] {
  if (!isCollNodeName(coll.name)) return [];
  const children: SyntaxNode[] = [];
  for (let cur = coll.firstChild; cur; cur = cur.nextSibling) {
    if (isCollDelimiterNode(cur, coll)) {
      // skip delimiters
    } else if (cur.from >= coll.from && cur.to <= coll.to) {
      children.push(cur);
    }
  }
  return children;
}

export function symbolText(node: SyntaxNode, doc: string): string | null {
  if (node.name !== 'Symbol') return null;
  return doc.slice(node.from, node.to);
}

function innermostCollNode(state: EditorState, pos: number): SyntaxNode | null {
  let node: SyntaxNode | null = syntaxTree(state).resolveInner(pos, -1);
  let best: SyntaxNode | null = null;
  while (node) {
    if (
      isCollNodeName(node.name) &&
      node.from <= pos &&
      pos <= node.to &&
      (!best || node.to - node.from < best.to - best.from)
    ) {
      best = node;
    }
    node = node.parent;
  }
  return best;
}

function enclosingCollNode(state: EditorState, pos: number): SyntaxNode | null {
  return innermostCollNode(state, pos);
}

function scanOpenDelim(
  doc: string,
  pos: number,
): { openLen: number; close: string } | null {
  if (doc.slice(pos, pos + 6) === '#vu8(') {
    return { openLen: 6, close: ')' };
  }
  if (doc.slice(pos, pos + 2) === '#(') {
    return { openLen: 2, close: ')' };
  }
  const ch = doc[pos];
  if (ch === '(') return { openLen: 1, close: ')' };
  if (ch === '[') return { openLen: 1, close: ']' };
  if (ch === '{') return { openLen: 1, close: '}' };
  return null;
}

function scanToClose(
  doc: string,
  openPos: number,
  root: { openLen: number; close: string },
): number | null {
  const stack = [root.close];
  let i = openPos + root.openLen;
  while (i < doc.length && stack.length > 0) {
    const nested = scanOpenDelim(doc, i);
    if (nested) {
      stack.push(nested.close);
      i += nested.openLen;
    } else {
      const expected = stack[stack.length - 1]!;
      if (doc[i] === expected) {
        stack.pop();
        if (stack.length === 0) return i + 1;
      }
      i += 1;
    }
  }
  return null;
}

function scanEnclosingSexp(doc: string, pos: number): SexpRange | null {
  const clamped = Math.min(Math.max(pos, 0), Math.max(doc.length - 1, 0));
  let start = clamped;
  while (start >= 0) {
    const spec = scanOpenDelim(doc, start);
    if (spec) {
      const end = scanToClose(doc, start, spec);
      if (end !== null && pos >= start && pos < end) {
        return { from: start, to: end, nodeName: 'List' };
      }
    }
    start -= 1;
  }
  return null;
}

export function enclosingSexp(
  state: EditorState,
  pos: number,
): SexpRange | null {
  const node = enclosingCollNode(state, pos);
  if (node) {
    return { from: node.from, to: node.to, nodeName: node.name };
  }
  const scanned = scanEnclosingSexp(state.doc.toString(), pos);
  return scanned;
}

export function parentCollNode(
  state: EditorState,
  coll: SyntaxNode,
): SyntaxNode | null {
  let { parent } = coll;
  while (parent && !isCollNodeName(parent.name)) {
    parent = parent.parent;
  }
  return parent && isCollNodeName(parent.name) ? parent : null;
}

export function semanticRangesAt(state: EditorState, pos: number): SexpRange[] {
  const doc = state.doc.toString();
  const ranges: SexpRange[] = [];
  const tree = syntaxTree(state);
  let node = tree.resolveInner(pos, -1);
  while (node) {
    if (node.name && ATOM_NODE_NAMES.has(node.name)) {
      ranges.push({ from: node.from, to: node.to, nodeName: node.name });
    }
    if (isCollNodeName(node.name)) {
      ranges.push({ from: node.from, to: node.to, nodeName: node.name });
    }
    node = node.parent!;
  }
  const scanned = scanEnclosingSexp(doc, pos);
  if (
    scanned &&
    !ranges.some((r) => r.from === scanned.from && r.to === scanned.to)
  ) {
    ranges.unshift(scanned);
  }
  ranges.sort((a, b) => a.to - a.from - (b.to - b.from));
  return ranges.filter(
    (range, index, all) =>
      all.findIndex((r) => r.from === range.from && r.to === range.to) ===
      index,
  );
}

function siblingIndex(children: SyntaxNode[], target: SyntaxNode): number {
  return children.findIndex(
    (c) => c.from === target.from && c.to === target.to,
  );
}

export function forwardSlurp(
  state: EditorState,
  pos: number,
): TransactionSpec | null {
  const coll = enclosingCollNode(state, pos);
  if (!coll) return null;
  const parent = parentCollNode(state, coll);
  if (!parent) return null;
  const siblings = expressionChildren(parent);
  const index = siblingIndex(siblings, coll);
  if (index < 0 || index >= siblings.length - 1) return null;
  const next = siblings[index + 1]!;
  const close = collDelimiterAt(coll, 'close');
  return {
    changes: [
      { from: close.from, to: close.to, insert: '' },
      {
        from: next.to,
        to: next.to,
        insert: state.doc.sliceString(close.from, close.to),
      },
    ],
  };
}

export function backwardSlurp(
  state: EditorState,
  pos: number,
): TransactionSpec | null {
  const coll = enclosingCollNode(state, pos);
  if (!coll) return null;
  const parent = parentCollNode(state, coll);
  if (!parent) return null;
  const siblings = expressionChildren(parent);
  const index = siblingIndex(siblings, coll);
  if (index <= 0) return null;
  const prev = siblings[index - 1]!;
  const open = collDelimiterAt(coll, 'open');
  return {
    changes: [
      { from: open.from, to: open.to, insert: '' },
      {
        from: prev.from,
        to: prev.from,
        insert: state.doc.sliceString(open.from, open.to),
      },
    ],
  };
}

export function forwardBarf(
  state: EditorState,
  pos: number,
): TransactionSpec | null {
  const coll = enclosingCollNode(state, pos);
  if (!coll) return null;
  const children = expressionChildren(coll);
  if (children.length < 2) return null;
  const prev = children[children.length - 2]!;
  const last = children[children.length - 1]!;
  const close = collDelimiterAt(coll, 'close');
  const closeText = state.doc.sliceString(close.from, close.to);
  const lastText = state.doc.sliceString(last.from, last.to);
  return {
    changes: {
      from: prev.to,
      to: close.to,
      insert: `${closeText} ${lastText}`,
    },
  };
}

export function backwardBarf(
  state: EditorState,
  pos: number,
): TransactionSpec | null {
  const coll = enclosingCollNode(state, pos);
  if (!coll) return null;
  const children = expressionChildren(coll);
  if (children.length < 2) return null;
  const first = children[0]!;
  const open = collDelimiterAt(coll, 'open');
  const openText = state.doc.sliceString(open.from, open.to);
  const firstText = state.doc.sliceString(first.from, first.to);
  let end = first.to;
  if (end < coll.to && /\s/.test(state.doc.sliceString(end, end + 1))) {
    end += 1;
  }
  return {
    changes: {
      from: open.from,
      to: end,
      insert: `${firstText} ${openText}`,
    },
  };
}

export function spliceSexp(
  state: EditorState,
  pos: number,
): TransactionSpec | null {
  const coll = enclosingCollNode(state, pos);
  if (!coll) return null;
  const spec = SCHEME_COLL_DELIMS[coll.name]!;
  return {
    changes: {
      from: coll.from,
      to: coll.to,
      insert: state.doc.sliceString(
        coll.from + spec.openLen,
        coll.to - spec.closeLen,
      ),
    },
  };
}

export function raiseSexp(
  state: EditorState,
  pos: number,
): TransactionSpec | null {
  const coll = enclosingCollNode(state, pos);
  if (!coll) return null;
  const parent = parentCollNode(state, coll);
  if (!parent) return null;
  const spec = SCHEME_COLL_DELIMS[coll.name]!;
  const inner = state.doc.sliceString(
    coll.from + spec.openLen,
    coll.to - spec.closeLen,
  );
  return {
    changes: { from: coll.from, to: coll.to, insert: inner },
  };
}

export function moveToSexpBoundary(
  state: EditorState,
  pos: number,
  direction: 'forward' | 'backward',
): TransactionSpec | null {
  const sexp = enclosingSexp(state, pos);
  if (!sexp) return null;
  const nextPos = direction === 'forward' ? sexp.to : sexp.from;
  return { selection: { anchor: nextPos } };
}

export function killSexp(
  state: EditorState,
  pos: number,
): TransactionSpec | null {
  const sexp = enclosingSexp(state, pos);
  if (!sexp) return null;
  return {
    changes: { from: sexp.from, to: sexp.to, insert: '' },
    selection: { anchor: sexp.from },
  };
}

export function expandSelection(state: EditorState): TransactionSpec | null {
  const { from, to } = state.selection.main;
  const pos = from;
  const ranges = semanticRangesAt(state, pos);
  if (ranges.length === 0) return null;

  if (from === to) {
    const next = ranges[0]!;
    return { selection: { anchor: next.from, head: next.to } };
  }

  const currentLen = to - from;
  const idx = ranges.findIndex((r) => r.from === from && r.to === to);
  if (idx >= 0 && idx < ranges.length - 1) {
    const next = ranges[idx + 1]!;
    return { selection: { anchor: next.from, head: next.to } };
  }

  const outer = ranges.find(
    (r) => r.to - r.from > currentLen && r.from <= from && r.to >= to,
  );
  if (outer) {
    return { selection: { anchor: outer.from, head: outer.to } };
  }
  return null;
}

export function contractSelection(state: EditorState): TransactionSpec | null {
  const { from, to } = state.selection.main;
  if (from === to) return null;
  const ranges = semanticRangesAt(state, from);
  const idx = ranges.findIndex((r) => r.from === from && r.to === to);
  if (idx > 0) {
    const inner = ranges[idx - 1]!;
    return { selection: { anchor: inner.from, head: inner.to } };
  }
  const { anchor } = state.selection.main;
  return { selection: { anchor, head: anchor } };
}
