import type { SyntaxNode } from '@lezer/common';
import type { SidebarOutlineItem } from '../outlineIndex';
import { parser } from './lezer-scheme/parser.js';
import { expressionChildren, symbolText } from './sexpOps';
import { isCollNodeName } from './schemeCollNodes';

const DEFINE_HEADS = new Set([
  'define',
  'defun',
  'define-syntax',
  'define-values',
  'define-record-type',
  'define-module',
  'define-public',
  'define-private',
  'define-library',
  'module',
  'module+',
  'library',
  'defmodule',
]);

const MODULE_LIKE = new Set(['module', 'module+', 'library', 'define-module']);

function lineNumber(content: string, offset: number): number {
  let line = 1;
  for (let i = 0; i < offset && i < content.length; i += 1) {
    if (content[i] === '\n') line += 1;
  }
  return line;
}

function titleFromDefineForm(
  head: string,
  args: SyntaxNode[],
  doc: string,
): string | null {
  if (args.length === 0) return null;

  if (head === 'define' || head === 'defun' || head === 'define-syntax') {
    const first = args[0]!;
    if (first.name === 'Symbol') {
      return symbolText(first, doc);
    }
    if (isCollNodeName(first.name)) {
      const inner = expressionChildren(first);
      const nameNode = inner[0];
      if (nameNode?.name === 'Symbol') {
        return symbolText(nameNode, doc);
      }
    }
    return null;
  }

  if (MODULE_LIKE.has(head)) {
    const nameNode = args[0];
    if (nameNode?.name === 'Symbol') {
      return symbolText(nameNode, doc);
    }
    return null;
  }

  if (head === 'define-values' || head === 'define-record-type') {
    const nameNode = args[0];
    if (nameNode?.name === 'Symbol') {
      return symbolText(nameNode, doc);
    }
    if (isCollNodeName(nameNode?.name ?? '')) {
      const inner = expressionChildren(nameNode!);
      const sym = inner.find((n) => n.name === 'Symbol');
      if (sym) return symbolText(sym, doc);
    }
    return null;
  }

  const sym = args.find((n) => n.name === 'Symbol');
  return sym ? symbolText(sym, doc) : head;
}

function defineBodyStart(head: string, kidsLength: number): number {
  if (
    head === 'define' ||
    head === 'defun' ||
    head === 'define-syntax' ||
    head === 'define-values' ||
    head === 'define-record-type'
  ) {
    return 2;
  }
  if (MODULE_LIKE.has(head)) {
    return Math.min(3, kidsLength);
  }
  return 1;
}

function collectOutlineFromNode(
  node: SyntaxNode,
  doc: string,
  depth: number,
  items: SidebarOutlineItem[],
  counter: { value: number },
): void {
  if (isCollNodeName(node.name)) {
    const kids = expressionChildren(node);
    const headNode = kids[0];
    const head = headNode?.name === 'Symbol' ? symbolText(headNode, doc) : null;

    if (head && DEFINE_HEADS.has(head)) {
      counter.value += 1;
      const title = titleFromDefineForm(head, kids.slice(1), doc) ?? head;
      items.push({
        id: `scheme-${counter.value}`,
        title,
        depth,
        line: lineNumber(doc, node.from),
        page: null,
      });
      const bodyStart = defineBodyStart(head, kids.length);
      kids.slice(bodyStart).forEach((kid) => {
        collectOutlineFromNode(kid, doc, depth + 1, items, counter);
      });
      return;
    }

    kids.forEach((kid) => {
      collectOutlineFromNode(kid, doc, depth, items, counter);
    });
    return;
  }

  const childNodes: SyntaxNode[] = [];
  let cur = node.firstChild;
  while (cur) {
    childNodes.push(cur);
    cur = cur.nextSibling;
  }
  childNodes.forEach((child) => {
    collectOutlineFromNode(child, doc, depth, items, counter);
  });
}

export default function parseSchemeOutline(
  content: string,
): SidebarOutlineItem[] {
  const tree = parser.parse(content);
  const items: SidebarOutlineItem[] = [];
  const counter = { value: 0 };
  collectOutlineFromNode(tree.topNode, content, 1, items, counter);
  return items;
}
