import type { SyntaxNode } from '@lezer/common';
import {
  createExtractContext,
  finishExtract,
  firstChildMatching,
  pushDef,
  pushRef,
  type ExtractContext,
} from '../extractHelpers';
import type { FileSymbolExtract, SymbolKind } from '../types';

const NAME_NODES = new Set([
  'VariableDefinition',
  'PropertyDefinition',
  'TypeDefinition',
]);

const REF_NODES = new Set([
  'VariableName',
  'PropertyName',
  'TypeName',
  'LabelName',
]);

const CONTAINER_NODES = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunction',
  'ClassDeclaration',
  'ClassExpression',
  'MethodDeclaration',
  'InterfaceDeclaration',
  'EnumDeclaration',
]);

function definitionKind(node: SyntaxNode): SymbolKind | null {
  switch (node.name) {
    case 'FunctionDeclaration':
    case 'FunctionExpression':
    case 'ArrowFunction':
      return 'function';
    case 'ClassDeclaration':
    case 'ClassExpression':
      return 'class';
    case 'MethodDeclaration':
    case 'GetterDeclaration':
    case 'SetterDeclaration':
      return 'method';
    case 'InterfaceDeclaration':
      return 'interface';
    case 'TypeAliasDeclaration':
      return 'type';
    case 'EnumDeclaration':
      return 'enum';
    case 'VariableDeclaration':
      return 'variable';
    default:
      return null;
  }
}

function collectJsDefs(
  node: SyntaxNode,
  ctx: ExtractContext,
  depth: number,
): void {
  const kind = definitionKind(node);

  if (node.name === 'VariableDeclaration' && kind) {
    let child = node.firstChild;
    while (child) {
      if (child.name === 'VariableDefinition') {
        pushDef(ctx, child, 'variable', depth, node.from);
      } else if (
        child.name === 'ObjectPattern' ||
        child.name === 'ArrayPattern'
      ) {
        collectPatternDefs(child, ctx, depth, node.from);
      }
      child = child.nextSibling;
    }
  } else if (kind) {
    const nameNode = firstChildMatching(node, NAME_NODES);
    if (nameNode) {
      pushDef(ctx, nameNode, kind, depth, node.from);
    }
  }

  const nextDepth = CONTAINER_NODES.has(node.name) ? depth + 1 : depth;
  let child = node.firstChild;
  while (child) {
    collectJsDefs(child, ctx, nextDepth);
    child = child.nextSibling;
  }
}

function collectJsVariableDefs(
  node: SyntaxNode,
  ctx: ExtractContext,
  depth: number,
): void {
  if (node.name === 'VariableDefinition') {
    pushDef(ctx, node, 'variable', depth, node.from, false);
    return;
  }

  const nextDepth = CONTAINER_NODES.has(node.name) ? depth + 1 : depth;
  let child = node.firstChild;
  while (child) {
    collectJsVariableDefs(child, ctx, nextDepth);
    child = child.nextSibling;
  }
}

function collectPatternDefs(
  node: SyntaxNode,
  ctx: ExtractContext,
  depth: number,
  previewFrom: number,
): void {
  if (node.name === 'PatternProperty') {
    const valueDef = node.getChild('VariableDefinition');
    if (valueDef) {
      pushDef(ctx, valueDef, 'variable', depth, previewFrom);
      return;
    }
    const prop = node.getChild('PropertyName');
    if (prop) {
      pushDef(ctx, prop, 'variable', depth, previewFrom);
    }
    return;
  }

  let child = node.firstChild;
  while (child) {
    if (
      child.name === 'VariableDefinition' ||
      child.name === 'PropertyDefinition'
    ) {
      pushDef(ctx, child, 'variable', depth, previewFrom);
    } else if (
      child.name === 'PatternProperty' ||
      child.name === 'ObjectPattern' ||
      child.name === 'ArrayPattern' ||
      child.name === 'AssignmentPattern'
    ) {
      collectPatternDefs(child, ctx, depth, previewFrom);
    }
    child = child.nextSibling;
  }
}

function collectJsRefs(node: SyntaxNode, ctx: ExtractContext): void {
  if (REF_NODES.has(node.name)) {
    pushRef(ctx, node);
    return;
  }
  // Skip string/comment content
  if (
    node.name === 'String' ||
    node.name === 'TemplateString' ||
    node.name === 'LineComment' ||
    node.name === 'BlockComment' ||
    node.name === 'RegExp'
  ) {
    return;
  }
  let child = node.firstChild;
  while (child) {
    collectJsRefs(child, ctx);
    child = child.nextSibling;
  }
}

export function extractJavascriptSymbols(
  treeTop: SyntaxNode,
  content: string,
  relativePath: string,
): FileSymbolExtract {
  const ctx = createExtractContext(content, relativePath);
  collectJsDefs(treeTop, ctx, 1);
  collectJsVariableDefs(treeTop, ctx, 1);
  collectJsRefs(treeTop, ctx);
  return finishExtract(ctx);
}
