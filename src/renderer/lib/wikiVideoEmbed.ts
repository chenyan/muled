export const WIKI_VIDEO_DATA_ATTR = 'data-muled-wiki-video';
export const MULED_FILE_VIDEO_DATA_ATTR = 'data-muled-file-video';

export function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

export function unescapeHtmlAttr(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}

export function buildWikiVideoEmbedHtml(
  path: string,
  kind: 'wiki' | 'file',
): string {
  const attr =
    kind === 'wiki' ? WIKI_VIDEO_DATA_ATTR : MULED_FILE_VIDEO_DATA_ATTR;
  return `<div ${attr}="${escapeHtmlAttr(path)}" class="MuledWikiVideo"></div>`;
}

export function parseWikiVideoEmbedHtml(
  html: string,
): { kind: 'wiki' | 'file'; path: string } | null {
  const trimmed = html.trim();
  const wikiMatch = trimmed.match(
    new RegExp(
      `^<div\\b[^>]*\\b${WIKI_VIDEO_DATA_ATTR}="([^"]*)"[^>]*>\\s*</div>$`,
      'i',
    ),
  );
  if (wikiMatch) {
    return {
      kind: 'wiki',
      path: unescapeHtmlAttr(wikiMatch[1]),
    };
  }

  const fileMatch = trimmed.match(
    new RegExp(
      `^<div\\b[^>]*\\b${MULED_FILE_VIDEO_DATA_ATTR}="([^"]*)"[^>]*>\\s*</div>$`,
      'i',
    ),
  );
  if (fileMatch) {
    return {
      kind: 'file',
      path: unescapeHtmlAttr(fileMatch[1]),
    };
  }

  return null;
}
