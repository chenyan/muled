import type { SyntaxNode } from '@lezer/common';
import {
  createExtractContext,
  finishExtract,
  pushDef,
  pushRef,
  type ExtractContext,
} from '../extractHelpers';
import type { FileSymbolExtract, SymbolKind } from '../types';

const CONTAINERS = new Set([
  'ClassDeclaration',
  'InterfaceDeclaration',
  'MethodDeclaration',
  'ConstructorDeclaration',
]);

function collectDefs(
  node: SyntaxNode,
  ctx: ExtractContext,
  depth: number,
): void {
  let kind: SymbolKind | null = null;

  switch (node.name) {
    case 'ClassDeclaration':
      kind = 'class';
      break;
    case 'InterfaceDeclaration':
      kind = 'interface';
      break;
    case 'MethodDeclaration':
    case 'ConstructorDeclaration':
      kind = 'method';
      break;
    case 'EnumDeclaration':
      kind = 'enum';
      break;
    case 'FieldDeclaration':
      kind = 'property';
      break;
    default:
      break;
  }

  if (kind) {
    const nameNode = node.getChild('Definition');
    if (nameNode) {
      pushDef(ctx, nameNode, kind, depth, node.from);
    }
  }

  const nextDepth = CONTAINERS.has(node.name) ? depth + 1 : depth;
  let child = node.firstChild;
  while (child) {
    collectDefs(child, ctx, nextDepth);
    child = child.nextSibling;
  }
}

function collectVariableDefs(
  node: SyntaxNode,
  ctx: ExtractContext,
  depth: number,
): void {
  if (node.name === 'Definition') {
    pushDef(ctx, node, 'variable', depth, node.from, false);
    return;
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
    node.name === 'TypeName' ||
    node.name === 'MethodName'
  ) {
    // MethodName often wraps Identifier; prefer leaf Identifier via recursion
    if (node.name === 'MethodName') {
      let child = node.firstChild;
      while (child) {
        collectRefs(child, ctx);
        child = child.nextSibling;
      }
      return;
    }
    pushRef(ctx, node);
    return;
  }
  if (
    node.name === 'StringLiteral' ||
    node.name === 'LineComment' ||
    node.name === 'BlockComment'
  ) {
    return;
  }
  let child = node.firstChild;
  while (child) {
    collectRefs(child, ctx);
    child = child.nextSibling;
  }
}

export function extractJavaSymbols(
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
