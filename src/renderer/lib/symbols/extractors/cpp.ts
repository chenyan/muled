import type { SyntaxNode } from '@lezer/common';
import {
  createExtractContext,
  finishExtract,
  pushDef,
  pushRef,
  type ExtractContext,
} from '../extractHelpers';
import type { FileSymbolExtract } from '../types';

const CONTAINERS = new Set([
  'FunctionDefinition',
  'ClassSpecifier',
  'StructSpecifier',
  'NamespaceDefinition',
]);

function findFunctionDeclarator(node: SyntaxNode): SyntaxNode | null {
  const direct = node.getChild('FunctionDeclarator');
  if (direct) return direct;
  let child = node.firstChild;
  while (child) {
    if (child.name === 'FunctionDeclarator') return child;
    const nested = child.getChild('FunctionDeclarator');
    if (nested) return nested;
    child = child.nextSibling;
  }
  return null;
}

function collectDefs(
  node: SyntaxNode,
  ctx: ExtractContext,
  depth: number,
): void {
  if (node.name === 'FunctionDefinition') {
    const declarator = findFunctionDeclarator(node);
    const nameNode =
      declarator?.getChild('Identifier') ??
      declarator?.getChild('FieldIdentifier');
    if (nameNode) {
      pushDef(ctx, nameNode, 'function', depth, node.from);
    }
  } else if (
    node.name === 'ClassSpecifier' ||
    node.name === 'StructSpecifier'
  ) {
    const nameNode =
      node.getChild('TypeIdentifier') ?? node.getChild('Identifier');
    if (nameNode) {
      pushDef(
        ctx,
        nameNode,
        node.name === 'StructSpecifier' ? 'struct' : 'class',
        depth,
        node.from,
      );
    }
  } else if (node.name === 'NamespaceDefinition') {
    const nameNode =
      node.getChild('NamespaceIdentifier') ?? node.getChild('Identifier');
    if (nameNode) {
      pushDef(ctx, nameNode, 'module', depth, node.from);
    }
  }

  const nextDepth = CONTAINERS.has(node.name) ? depth + 1 : depth;
  let child = node.firstChild;
  while (child) {
    collectDefs(child, ctx, nextDepth);
    child = child.nextSibling;
  }
}

function declaratorIdentifier(node: SyntaxNode): SyntaxNode | null {
  const direct =
    node.getChild('Identifier') ?? node.getChild('FieldIdentifier');
  if (direct) return direct;
  const init = node.getChild('InitDeclarator');
  if (init) {
    return init.getChild('Identifier') ?? init.getChild('FieldIdentifier');
  }
  return null;
}

function collectVariableDefs(
  node: SyntaxNode,
  ctx: ExtractContext,
  depth: number,
): void {
  if (node.name === 'ParameterDeclaration' || node.name === 'Declaration') {
    const nameNode = declaratorIdentifier(node);
    if (nameNode) {
      pushDef(ctx, nameNode, 'variable', depth, node.from, false);
    }
  }
  const nextDepth = CONTAINERS.has(node.name) ? depth + 1 : depth;
  let child = node.firstChild;
  while (child) {
    collectVariableDefs(child, ctx, nextDepth);
    child = child.nextSibling;
  }
}

function collectRefs(node: SyntaxNode, ctx: ExtractContext): void {
  if (
    node.name === 'Identifier' ||
    node.name === 'TypeIdentifier' ||
    node.name === 'FieldIdentifier' ||
    node.name === 'NamespaceIdentifier'
  ) {
    pushRef(ctx, node);
    return;
  }
  if (
    node.name === 'StringLiteral' ||
    node.name === 'CharLiteral' ||
    node.name === 'Comment'
  ) {
    return;
  }
  let child = node.firstChild;
  while (child) {
    collectRefs(child, ctx);
    child = child.nextSibling;
  }
}

export function extractCppSymbols(
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
