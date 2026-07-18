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
  'FunctionItem',
  'ImplItem',
  'StructItem',
  'EnumItem',
  'TraitItem',
  'ModItem',
]);

function collectDefs(
  node: SyntaxNode,
  ctx: ExtractContext,
  depth: number,
): void {
  let kind: SymbolKind | null = null;
  let nameNode: SyntaxNode | null = null;

  switch (node.name) {
    case 'FunctionItem':
      kind = 'function';
      nameNode = node.getChild('BoundIdentifier');
      break;
    case 'StructItem':
      kind = 'struct';
      nameNode = node.getChild('TypeIdentifier');
      break;
    case 'EnumItem':
      kind = 'enum';
      nameNode = node.getChild('TypeIdentifier');
      break;
    case 'TraitItem':
      kind = 'interface';
      nameNode = node.getChild('TypeIdentifier');
      break;
    case 'ModItem':
      kind = 'module';
      nameNode =
        node.getChild('Identifier') ?? node.getChild('BoundIdentifier');
      break;
    case 'ConstItem':
    case 'StaticItem':
      kind = 'variable';
      nameNode =
        node.getChild('Identifier') ?? node.getChild('BoundIdentifier');
      break;
    case 'TypeItem':
      kind = 'type';
      nameNode = node.getChild('TypeIdentifier');
      break;
    default:
      break;
  }

  if (kind && nameNode) {
    pushDef(ctx, nameNode, kind, depth, node.from);
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
  if (node.name === 'BoundIdentifier') {
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
    node.name === 'TypeIdentifier' ||
    node.name === 'FieldIdentifier' ||
    node.name === 'BoundIdentifier'
  ) {
    pushRef(ctx, node);
    return;
  }
  if (
    node.name === 'String' ||
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

export function extractRustSymbols(
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
