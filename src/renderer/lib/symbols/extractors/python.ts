import type { SyntaxNode } from '@lezer/common';
import {
  createExtractContext,
  finishExtract,
  pushDef,
  pushRef,
  type ExtractContext,
} from '../extractHelpers';
import type { FileSymbolExtract } from '../types';

const CONTAINERS = new Set(['FunctionDefinition', 'ClassDefinition']);

function collectDefs(
  node: SyntaxNode,
  ctx: ExtractContext,
  depth: number,
): void {
  if (node.name === 'FunctionDefinition' || node.name === 'ClassDefinition') {
    const nameNode = node.getChild('VariableName');
    if (nameNode) {
      pushDef(
        ctx,
        nameNode,
        node.name === 'ClassDefinition' ? 'class' : 'function',
        depth,
        node.from,
      );
    }
  }

  const nextDepth = CONTAINERS.has(node.name) ? depth + 1 : depth;
  let child = node.firstChild;
  while (child) {
    collectDefs(child, ctx, nextDepth);
    child = child.nextSibling;
  }
}

function pushDirectVariableNames(
  node: SyntaxNode,
  ctx: ExtractContext,
  depth: number,
  stopAt?: string,
): void {
  let child = node.firstChild;
  while (child) {
    if (stopAt && child.name === stopAt) break;
    if (child.name === 'VariableName') {
      pushDef(ctx, child, 'variable', depth, node.from, false);
    }
    child = child.nextSibling;
  }
}

function collectVariableDefs(
  node: SyntaxNode,
  ctx: ExtractContext,
  depth: number,
): void {
  if (node.name === 'ParamList') {
    pushDirectVariableNames(node, ctx, depth);
  } else if (node.name === 'AssignStatement') {
    pushDirectVariableNames(node, ctx, depth, 'AssignOp');
  } else if (node.name === 'ForStatement') {
    pushDirectVariableNames(node, ctx, depth, 'in');
  }

  const nextDepth = CONTAINERS.has(node.name) ? depth + 1 : depth;
  let child = node.firstChild;
  while (child) {
    collectVariableDefs(child, ctx, nextDepth);
    child = child.nextSibling;
  }
}

function collectRefs(node: SyntaxNode, ctx: ExtractContext): void {
  if (node.name === 'VariableName' || node.name === 'PropertyName') {
    pushRef(ctx, node);
    return;
  }
  if (
    node.name === 'String' ||
    node.name === 'Comment' ||
    node.name === 'FormatString'
  ) {
    return;
  }
  let child = node.firstChild;
  while (child) {
    collectRefs(child, ctx);
    child = child.nextSibling;
  }
}

export function extractPythonSymbols(
  treeTop: SyntaxNode,
  content: string,
  relativePath: string,
): FileSymbolExtract {
  const ctx = createExtractContext(content, relativePath);
  collectDefs(treeTop, ctx, 1);
  collectVariableDefs(treeTop, ctx, 1);
  collectRefs(treeTop, ctx);
  return finishExtract(ctx);
}
