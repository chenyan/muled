import type { PdfOutlineItem } from '../../shared/types/ipc';
import { getSourceLanguageId, type SourceLanguageId } from './fileLanguage';
import { parseOrgOutline } from './orgOutline';
import { extractFileSymbols } from './symbols/extract';
import type { EditorTab } from '../types/tab';

export interface SidebarOutlineItem {
  id: string;
  title: string;
  depth: number;
  line: number | null;
  page: number | null;
  hash?: string | null;
}

export interface OutlineTreeNode {
  item: SidebarOutlineItem;
  children: OutlineTreeNode[];
}

export function buildOutlineTree(
  items: SidebarOutlineItem[],
): OutlineTreeNode[] {
  if (items.length === 0) return [];
  const roots: OutlineTreeNode[] = [];
  const stack: { depth: number; node: OutlineTreeNode }[] = [];

  for (const item of items) {
    const node: OutlineTreeNode = { item, children: [] };
    while (stack.length > 0 && stack[stack.length - 1]!.depth >= item.depth) {
      stack.pop();
    }
    if (stack.length === 0) {
      roots.push(node);
    } else {
      stack[stack.length - 1]!.node.children.push(node);
    }
    stack.push({ depth: item.depth, node });
  }
  return roots;
}

function parseMarkdownOutline(content: string): SidebarOutlineItem[] {
  const lines = content.split(/\r?\n/);
  const items: SidebarOutlineItem[] = [];
  lines.forEach((rawLine, index) => {
    const line = rawLine.trimStart();
    const match = line.match(/^(#{1,3})\s+(.+?)\s*#*\s*$/);
    if (!match) return;
    items.push({
      id: `md-${index + 1}`,
      title: match[2],
      depth: match[1].length,
      line: index + 1,
      page: null,
    });
  });
  return items;
}

function parseCodeSymbols(
  content: string,
  relativePath: string | null,
): SidebarOutlineItem[] {
  if (!relativePath) return [];
  const languageId: SourceLanguageId = getSourceLanguageId(relativePath);
  const { defs } = extractFileSymbols(languageId, content, relativePath);
  return defs
    .filter((def) => def.outline)
    .map((def, index) => ({
      id: `code-${index + 1}-${def.from}`,
      title: def.name,
      depth: def.depth,
      line: def.line,
      page: null,
    }));
}

function toPdfOutline(items: PdfOutlineItem[]): SidebarOutlineItem[] {
  return items.map((item, index) => ({
    id: `pdf-${index + 1}`,
    title: item.title,
    depth: item.depth,
    line: null,
    page: item.page,
  }));
}

function parseHtmlOutline(content: string): SidebarOutlineItem[] {
  const decodeHtmlEntities = (text: string): string =>
    text
      .replace(/&#(\d+);/g, (_, dec: string) =>
        String.fromCodePoint(Number.parseInt(dec, 10)),
      )
      .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
        String.fromCodePoint(Number.parseInt(hex, 16)),
      )
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/g, "'");
  const items: SidebarOutlineItem[] = [];
  const titleMatch = content.match(/<title[^>]*>([^<]*)<\/title>/i);
  if (titleMatch?.[1]?.trim()) {
    items.push({
      id: 'html-title',
      title: decodeHtmlEntities(titleMatch[1]).trim(),
      depth: 1,
      line: null,
      page: null,
      hash: null,
    });
  }
  const headingPattern = /<h([1-6])([^>]*)>([\s\S]*?)<\/h\1>/gi;
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = headingPattern.exec(content)) !== null) {
    const attrs = match[2] ?? '';
    const innerHtml = match[3] ?? '';
    const title = decodeHtmlEntities(innerHtml.replace(/<[^>]+>/g, '')).trim();
    if (!title) continue;
    const idMatch = attrs.match(
      /\bid\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s"'=<>`]+))/i,
    );
    const anchorNameMatch = innerHtml.match(
      /<a[^>]*\bname\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s"'=<>`]+))[^>]*>/i,
    );
    const hash = decodeHtmlEntities(
      idMatch?.[1] ??
        idMatch?.[2] ??
        idMatch?.[3] ??
        anchorNameMatch?.[1] ??
        anchorNameMatch?.[2] ??
        anchorNameMatch?.[3] ??
        '',
    ).trim();
    index += 1;
    items.push({
      id: `html-${index}`,
      title,
      depth: Number(match[1]),
      line: null,
      page: null,
      hash: hash || null,
    });
  }
  return items;
}

export function buildTabOutline(
  tab: EditorTab | null,
  pdfItems: PdfOutlineItem[],
): SidebarOutlineItem[] {
  if (!tab || !tab.relativePath) return [];
  if (tab.kind === 'markdown') {
    return parseMarkdownOutline(tab.content);
  }
  if (tab.kind === 'html') {
    return parseHtmlOutline(tab.content);
  }
  if (tab.kind === 'org') {
    return parseOrgOutline(tab.content);
  }
  if (tab.kind === 'text') {
    return parseCodeSymbols(tab.content, tab.relativePath);
  }
  if (tab.kind === 'pdf') {
    return toPdfOutline(pdfItems);
  }
  return [];
}
