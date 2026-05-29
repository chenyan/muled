import type { Definition, LinkReference, Nodes, Parent } from 'mdast';

/** 将 mdast 节点序列化为可读的 Markdown 文本（用于 WYSIWYG 降级） */
export function serializeMdastNodeForFallback(node: Nodes): string {
  if (node.type === 'text' || node.type === 'inlineCode') {
    return node.value;
  }
  if (node.type === 'code') {
    return node.value;
  }
  if (node.type === 'linkReference') {
    return formatLinkReference(node);
  }
  if (node.type === 'definition') {
    return formatLinkDefinition(node);
  }
  if (node.type === 'footnoteReference') {
    return `[^${node.identifier}]`;
  }
  if (node.type === 'footnoteDefinition') {
    const body = (node.children ?? [])
      .map((child) => serializeMdastNodeForFallback(child))
      .join('');
    return `[^${node.identifier}]: ${body}`;
  }
  if ('children' in node && Array.isArray((node as Parent).children)) {
    return (node as Parent).children
      .map((child) => serializeMdastNodeForFallback(child))
      .join('');
  }
  if ('value' in node && typeof node.value === 'string') {
    return node.value;
  }
  return `[${node.type}]`;
}

export function formatLinkReference(node: LinkReference): string {
  const label = String(node.label ?? node.identifier ?? '');
  if (label.startsWith('^')) {
    return `[${label}]`;
  }
  return `[${label}]`;
}

/** CommonMark 将 `[^n]: body` 解析为 definition，正文落在 url 字段 */
export function formatLinkDefinition(node: Definition): string {
  const label = String(node.label ?? node.identifier ?? '');
  const body = String(node.url ?? '');
  const ref = label.startsWith('^') ? `[${label}]` : `[${label}]`;
  return `${ref}: ${body}`;
}

/** 含 mdast 子节点、降级时不应再 visitChildren 的行内类型 */
export const COMPOSITE_INLINE_MDAST_TYPES = new Set<string>([
  'linkReference',
  'imageReference',
  'footnoteReference',
]);

export function isCompositeInlineMdastNode(node: Nodes): boolean {
  return COMPOSITE_INLINE_MDAST_TYPES.has(node.type);
}
