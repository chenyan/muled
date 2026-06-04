/** WYSIWYG 内部 wiki 链接 href 前缀，不得写入磁盘（# 开头避免 Lexical 净化为 about:blank） */
export const WIKI_LINK_SRC_PREFIX = '#muled-wiki:';

/** 旧版前缀，导出时仍兼容 */
export const WIKI_LINK_LEGACY_PREFIX = 'muled-wiki-link:';

/** Obsidian 风格 wiki 链接：[[page]] 或 [[page|label]]（不含 ![[...]] 图片嵌入） */
const WIKI_LINK_RE = /(?<!!)\[\[([^\]]+)\]\]/g;

const WIKI_LINK_MARKDOWN_RE =
  /\[([^\]]*)\]\((?:#muled-wiki:|muled-wiki-link:)([^)]+)\)/g;

function splitWikiLink(raw: string): { target: string; label: string | null } {
  const trimmed = raw.trim();
  const pipeIndex = trimmed.indexOf('|');
  if (pipeIndex === -1) {
    return { target: trimmed, label: null };
  }
  return {
    target: trimmed.slice(0, pipeIndex).trim(),
    label: trimmed.slice(pipeIndex + 1).trim() || null,
  };
}

export function exportWikiLinkMarkdown(target: string, label: string | null): string {
  const trimmedTarget = target.trim();
  if (!trimmedTarget) {
    return '';
  }
  const trimmedLabel = label?.trim() ?? '';
  if (trimmedLabel && trimmedLabel !== trimmedTarget) {
    return `[[${trimmedTarget}|${trimmedLabel}]]`;
  }
  return `[[${trimmedTarget}]]`;
}

/** 仅用于 WYSIWYG 载入（setMarkdown），勿用于更新 tab.content */
export function normalizeMarkdownWikiLinks(source: string): string {
  return source.replace(WIKI_LINK_RE, (match, raw: string) => {
    const { target, label } = splitWikiLink(raw);
    if (!target) {
      return match;
    }
    const text = label ?? target;
    return `[${text}](${WIKI_LINK_SRC_PREFIX}${encodeURIComponent(target)})`;
  });
}

/** 将 WYSIWYG 内部 wiki 链接还原为磁盘格式 */
export function exportWikiLinksFromMarkdown(source: string): string {
  return source.replace(WIKI_LINK_MARKDOWN_RE, (_, label: string, encodedTarget: string) => {
    let target = encodedTarget;
    try {
      target = decodeURIComponent(encodedTarget);
    } catch {
      /* 保留原样 */
    }
    const trimmedLabel = label.trim();
    return exportWikiLinkMarkdown(
      target,
      trimmedLabel && trimmedLabel !== target ? trimmedLabel : null,
    );
  });
}
