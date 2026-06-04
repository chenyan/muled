import {
  WIKI_LINK_LEGACY_PREFIX,
  WIKI_LINK_SRC_PREFIX,
} from './normalizeMarkdownWikiLinks';

/** Ctrl（Windows/Linux）或 ⌘（macOS）+ 点击打开链接 */
export function isLinkOpenModifier(event: MouseEvent): boolean {
  return event.ctrlKey || event.metaKey;
}

export function isExternalLinkHref(href: string): boolean {
  return /^https?:\/\//i.test(href) || href.startsWith('mailto:');
}

export function isWikiLinkHref(href: string): boolean {
  const normalized = normalizeWikiLinkHref(href);
  return (
    normalized.startsWith(WIKI_LINK_SRC_PREFIX) ||
    normalized.startsWith(WIKI_LINK_LEGACY_PREFIX)
  );
}

function normalizeWikiLinkHref(href: string): string {
  const trimmed = href.trim();
  if (
    trimmed.startsWith(WIKI_LINK_SRC_PREFIX) ||
    trimmed.startsWith(WIKI_LINK_LEGACY_PREFIX)
  ) {
    return trimmed;
  }
  const hashIndex = trimmed.indexOf('#');
  if (hashIndex >= 0) {
    return trimmed.slice(hashIndex);
  }
  return trimmed;
}

export function wikiLinkTitleFromHref(href: string): string {
  let title = normalizeWikiLinkHref(href);
  if (title.startsWith(WIKI_LINK_SRC_PREFIX)) {
    title = title.slice(WIKI_LINK_SRC_PREFIX.length);
  } else if (title.startsWith(WIKI_LINK_LEGACY_PREFIX)) {
    title = title.slice(WIKI_LINK_LEGACY_PREFIX.length);
  }
  try {
    title = decodeURIComponent(title);
  } catch {
    /* 保留原样 */
  }
  return title;
}
