import type { SyntaxNode } from '@lezer/common';
import {
  createExtractContext,
  finishExtract,
  pushDef,
  pushRef,
  type ExtractContext,
} from '../extractHelpers';
import type { FileSymbolExtract, SymbolKind } from '../types';

const CONTAINERS = new Set(['FunctionDecl', 'MethodDecl', 'TypeDecl']);

function collectDefs(
  node: SyntaxNode,
  ctx: ExtractContext,
  depth: number,
): void {
  let kind: SymbolKind | null = null;
  let nameNode: SyntaxNode | null = null;

  switch (node.name) {
    case 'FunctionDecl':
    case 'MethodDecl':
      kind = node.name === 'MethodDecl' ? 'method' : 'function';
      nameNode = node.getChild('DefName');
      break;
    case 'TypeDecl': {
      const spec = node.getChild('TypeSpec');
      if (spec) {
        nameNode = spec.getChild('DefName');
        const struct = spec.getChild('StructType');
        const iface = spec.getChild('InterfaceType');
        kind = struct ? 'struct' : iface ? 'interface' : 'type';
      }
      break;
    }
    case 'ConstSpec':
      kind = 'variable';
      nameNode = node.getChild('DefName');
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
  if (node.name === 'DefName') {
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
    node.name === 'VariableName' ||
    node.name === 'FieldName' ||
    node.name === 'TypeName'
  ) {
    pushRef(ctx, node);
    return;
  }
  if (
    node.name === 'InterpretedString' ||
    node.name === 'RawString' ||
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

export function extractGoSymbols(
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
