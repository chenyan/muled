import type { SyntaxNode, Tree } from '@lezer/common';
import { buildLineStarts, linePreview, offsetToLineCol } from './textOffsets';
import type {
  FileSymbolExtract,
  SymbolDef,
  SymbolKind,
  SymbolRef,
} from './types';

export interface ExtractContext {
  content: string;
  relativePath: string;
  lineStarts: number[];
  defs: SymbolDef[];
  refs: SymbolRef[];
  defRanges: Array<{ from: number; to: number }>;
}

export function createExtractContext(
  content: string,
  relativePath: string,
): ExtractContext {
  return {
    content,
    relativePath,
    lineStarts: buildLineStarts(content),
    defs: [],
    refs: [],
    defRanges: [],
  };
}

export function finishExtract(ctx: ExtractContext): FileSymbolExtract {
  const defKeys = new Set(ctx.defRanges.map((r) => `${r.from}:${r.to}`));
  const refs = ctx.refs.filter((ref) => !defKeys.has(`${ref.from}:${ref.to}`));
  return { defs: ctx.defs, refs };
}

export function pushDef(
  ctx: ExtractContext,
  nameNode: SyntaxNode,
  kind: SymbolKind,
  depth: number,
  previewFrom?: number,
  outline = true,
): void {
  const name = ctx.content.slice(nameNode.from, nameNode.to);
  if (!name) return;
  if (
    ctx.defRanges.some(
      (range) => range.from === nameNode.from && range.to === nameNode.to,
    )
  ) {
    return;
  }
  const { line, column } = offsetToLineCol(ctx.lineStarts, nameNode.from);
  ctx.defs.push({
    name,
    kind,
    depth: Math.max(1, depth),
    outline,
    relativePath: ctx.relativePath,
    line,
    column,
    from: nameNode.from,
    to: nameNode.to,
    preview: linePreview(ctx.content, previewFrom ?? nameNode.from),
  });
  ctx.defRanges.push({ from: nameNode.from, to: nameNode.to });
}

export function pushRef(ctx: ExtractContext, nameNode: SyntaxNode): void {
  const name = ctx.content.slice(nameNode.from, nameNode.to);
  if (!name) return;
  const { line, column } = offsetToLineCol(ctx.lineStarts, nameNode.from);
  ctx.refs.push({
    name,
    relativePath: ctx.relativePath,
    line,
    column,
    from: nameNode.from,
    to: nameNode.to,
  });
}

export function childByName(node: SyntaxNode, name: string): SyntaxNode | null {
  let child = node.firstChild;
  while (child) {
    if (child.name === name) return child;
    child = child.nextSibling;
  }
  return null;
}

export function firstChildMatching(
  node: SyntaxNode,
  names: ReadonlySet<string>,
): SyntaxNode | null {
  let child = node.firstChild;
  while (child) {
    if (names.has(child.name)) return child;
    child = child.nextSibling;
  }
  return null;
}

export function walkTree(
  tree: Tree,
  enter: (node: SyntaxNode) => void | false,
): void {
  tree.iterate({
    enter(nodeRef) {
      return enter(nodeRef.node);
    },
  });
}
