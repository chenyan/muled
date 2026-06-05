import type { EditorTab } from '../types/tab';
import type { PdfOutlineItem } from '../../shared/types/ipc';

export interface SidebarOutlineItem {
  id: string;
  title: string;
  depth: number;
  line: number | null;
  page: number | null;
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

function parseCodeTopLevelSymbols(content: string): SidebarOutlineItem[] {
  const lines = content.split(/\r?\n/);
  const items: SidebarOutlineItem[] = [];
  const pattern =
    /^(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)|^(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/;
  const pyPattern = /^(?:async\s+)?(?:def|class)\s+([A-Za-z_]\w*)/;

  lines.forEach((line, index) => {
    if (!line.trim()) return;
    const leading = line.match(/^\s*/)?.[0].length ?? 0;
    if (leading > 0) return;
    const trimmed = line.trim();
    const jsMatch = trimmed.match(pattern);
    if (jsMatch) {
      items.push({
        id: `code-${index + 1}`,
        title: jsMatch[1] ?? jsMatch[2],
        depth: 1,
        line: index + 1,
        page: null,
      });
      return;
    }
    const pyMatch = trimmed.match(pyPattern);
    if (pyMatch) {
      items.push({
        id: `code-${index + 1}`,
        title: pyMatch[1],
        depth: 1,
        line: index + 1,
        page: null,
      });
    }
  });
  return items;
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
  const items: SidebarOutlineItem[] = [];
  const titleMatch = content.match(/<title[^>]*>([^<]*)<\/title>/i);
  if (titleMatch?.[1]?.trim()) {
    items.push({
      id: 'html-title',
      title: titleMatch[1].trim(),
      depth: 1,
      line: null,
      page: null,
    });
  }
  const headingPattern = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = headingPattern.exec(content)) !== null) {
    const title = match[2].replace(/<[^>]+>/g, '').trim();
    if (!title) continue;
    index += 1;
    items.push({
      id: `html-${index}`,
      title,
      depth: Number(match[1]),
      line: null,
      page: null,
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
  if (tab.kind === 'text') {
    return parseCodeTopLevelSymbols(tab.content);
  }
  if (tab.kind === 'pdf') {
    return toPdfOutline(pdfItems);
  }
  return [];
}
