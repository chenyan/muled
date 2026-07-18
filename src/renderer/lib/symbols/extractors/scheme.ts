import type { SyntaxNode } from '@lezer/common';
import {
  createExtractContext,
  finishExtract,
  pushDef,
  pushRef,
  type ExtractContext,
} from '../extractHelpers';
import { expressionChildren, symbolText } from '../../scheme/sexpOps';
import { isCollNodeName } from '../../scheme/schemeCollNodes';
import type { FileSymbolExtract, SymbolKind } from '../types';

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

function kindForHead(head: string): SymbolKind {
  if (
    MODULE_LIKE.has(head) ||
    head === 'define-library' ||
    head === 'defmodule'
  ) {
    return 'module';
  }
  if (head === 'define-record-type') return 'struct';
  if (head === 'define-syntax') return 'type';
  return 'function';
}

function nameNodeFromDefineForm(
  head: string,
  args: SyntaxNode[],
): SyntaxNode | null {
  if (args.length === 0) return null;

  if (head === 'define' || head === 'defun' || head === 'define-syntax') {
    const first = args[0]!;
    if (first.name === 'Symbol') {
      return first;
    }
    if (isCollNodeName(first.name)) {
      const inner = expressionChildren(first);
      const nameNode = inner[0];
      if (nameNode?.name === 'Symbol') {
        return nameNode;
      }
    }
    return null;
  }

  if (MODULE_LIKE.has(head)) {
    const nameNode = args[0];
    if (nameNode?.name === 'Symbol') {
      return nameNode;
    }
    return null;
  }

  if (head === 'define-values' || head === 'define-record-type') {
    const nameNode = args[0];
    if (nameNode?.name === 'Symbol') {
      return nameNode;
    }
    if (isCollNodeName(nameNode?.name ?? '')) {
      const inner = expressionChildren(nameNode!);
      const sym = inner.find((n) => n.name === 'Symbol');
      if (sym) return sym;
    }
    return null;
  }

  return args.find((n) => n.name === 'Symbol') ?? null;
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

function collectFromNode(
  node: SyntaxNode,
  ctx: ExtractContext,
  depth: number,
): void {
  if (isCollNodeName(node.name)) {
    const kids = expressionChildren(node);
    const headNode = kids[0];
    const head =
      headNode?.name === 'Symbol' ? symbolText(headNode, ctx.content) : null;

    if (head && DEFINE_HEADS.has(head)) {
      const nameNode = nameNodeFromDefineForm(head, kids.slice(1));
      if (nameNode) {
        pushDef(ctx, nameNode, kindForHead(head), depth, node.from);
      }
      const signature = kids[1];
      if (
        (head === 'define' || head === 'defun') &&
        signature &&
        isCollNodeName(signature.name)
      ) {
        expressionChildren(signature)
          .slice(1)
          .filter((param) => param.name === 'Symbol')
          .forEach((param) => {
            pushDef(ctx, param, 'variable', depth + 1, node.from, false);
          });
      }
      const bodyStart = defineBodyStart(head, kids.length);
      kids.slice(bodyStart).forEach((kid) => {
        collectFromNode(kid, ctx, depth + 1);
      });
      return;
    }

    kids.forEach((kid) => {
      collectFromNode(kid, ctx, depth);
    });
    return;
  }

  if (node.name === 'Symbol') {
    pushRef(ctx, node);
    return;
  }

  let cur = node.firstChild;
  while (cur) {
    collectFromNode(cur, ctx, depth);
    cur = cur.nextSibling;
  }
}

export function extractSchemeSymbols(
  treeTop: SyntaxNode,
  content: string,
  relativePath: string,
): FileSymbolExtract {
  const ctx = createExtractContext(content, relativePath);
  collectFromNode(treeTop, ctx, 1);
  return finishExtract(ctx);
}
