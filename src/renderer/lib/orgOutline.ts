import type { SidebarOutlineItem } from './outlineIndex';

/** Org 标题行：未缩进，以若干 `*` + 空格开头 */
const ORG_HEADLINE_RE = /^(\*+)\s+(.+)$/;

/** 行尾 Org 标签，如 `:tag1:work:` */
const ORG_TAGS_RE = /\s+(:[\w@%#_+-]+:)+\s*$/;

/** 优先级 cookie，如 `[#A]` */
const ORG_PRIORITY_RE = /^\[[^\]]+\]\s+/;

/** 常见 TODO 关键字（大小写敏感） */
const ORG_TODO_KEYWORD_RE =
  /^(TODO|DONE|WAITING|NEXT|HOLD|CANCELLED|CANCELED|DEFERRED)\s+/;

function stripOrgHeadlineTitle(raw: string): string {
  let title = raw.trim();
  title = title.replace(ORG_TAGS_RE, '').trim();
  if (title.startsWith('COMMENT ')) {
    title = title.slice('COMMENT '.length).trim();
  }
  title = title.replace(ORG_TODO_KEYWORD_RE, '');
  title = title.replace(ORG_PRIORITY_RE, '');
  return title.trim();
}

/** 从 Org 源码解析 `*` 标题大纲 */
export function parseOrgOutline(content: string): SidebarOutlineItem[] {
  const lines = content.split(/\r?\n/);
  const items: SidebarOutlineItem[] = [];

  lines.forEach((line, index) => {
    if (/^\s/.test(line)) return;
    const match = line.match(ORG_HEADLINE_RE);
    if (!match) return;
    const depth = match[1].length;
    const title = stripOrgHeadlineTitle(match[2]);
    if (!title) return;
    items.push({
      id: `org-${index + 1}`,
      title,
      depth,
      line: index + 1,
      page: null,
    });
  });

  return items;
}
