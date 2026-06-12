import type { Html, Nodes, Parent } from 'mdast';

type MdxJsxFlowElement = Extract<Nodes, { type: 'mdxJsxFlowElement' }>;
type MdxJsxTextElement = Extract<Nodes, { type: 'mdxJsxTextElement' }>;

export type RenderableHtmlMdastNode =
  | Html
  | MdxJsxFlowElement
  | MdxJsxTextElement;

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function serializeMdxJsxAttributes(
  attributes: MdxJsxFlowElement['attributes'] | MdxJsxTextElement['attributes'],
): string {
  if (!attributes?.length) {
    return '';
  }

  return attributes
    .map((attr) => {
      if (attr.type !== 'mdxJsxAttribute' || !attr.name) {
        return '';
      }
      if (attr.value === null || attr.value === undefined) {
        return attr.name;
      }
      if (typeof attr.value === 'string') {
        return `${attr.name}="${escapeHtmlAttr(attr.value)}"`;
      }
      return attr.name;
    })
    .filter(Boolean)
    .join(' ');
}

function serializeMdastChildren(children: Nodes[] | undefined): string {
  return (children ?? []).map(serializeMdastContentNode).join('');
}

function serializeMdxJsxElement(node: MdxJsxFlowElement | MdxJsxTextElement): string {
  const name = node.name?.trim();
  if (!name) {
    return serializeMdastChildren(node.children);
  }

  const attrs = serializeMdxJsxAttributes(node.attributes);
  const open = attrs ? `<${name} ${attrs}>` : `<${name}>`;
  const inner = serializeMdastChildren(node.children);
  const close = `</${name}>`;

  if (node.type === 'mdxJsxFlowElement' && inner.includes('\n')) {
    return `${open}\n${inner}\n${close}`;
  }

  return `${open}${inner}${close}`;
}

function serializeMdastContentNode(node: Nodes): string {
  if (node.type === 'text' || node.type === 'inlineCode') {
    return node.value;
  }
  if (node.type === 'html') {
    return node.value;
  }
  if (node.type === 'mdxJsxTextElement' || node.type === 'mdxJsxFlowElement') {
    return serializeMdxJsxElement(node);
  }
  if ('children' in node && Array.isArray((node as Parent).children)) {
    return serializeMdastChildren((node as Parent).children);
  }
  if ('value' in node && typeof node.value === 'string') {
    return node.value;
  }
  return '';
}

export function isMuledMathSpan(node: {
  type: string;
  name?: string | null;
  attributes?: Array<{ type: string; name?: string | null }> | null;
}): boolean {
  if (
    (node.type !== 'mdxJsxTextElement' && node.type !== 'mdxJsxFlowElement') ||
    node.name !== 'span'
  ) {
    return false;
  }
  return (node.attributes ?? []).some(
    (item) => item.type === 'mdxJsxAttribute' && item.name === 'data-muled-math',
  );
}

export function isRenderableHtmlMdastNode(
  node: Nodes,
): node is RenderableHtmlMdastNode {
  if (node.type === 'html') {
    return true;
  }
  if (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') {
    return !isMuledMathSpan(node);
  }
  return false;
}

/** 将 mdast HTML / MDX JSX 节点序列化为可渲染的 HTML 字符串 */
export default function serializeMdastNodeToHtml(
  node: RenderableHtmlMdastNode,
): string {
  if (node.type === 'html') {
    return node.value;
  }
  return serializeMdxJsxElement(node);
}
