import { isCommonHtmlTagName } from './commonHtmlTagNames';
import { splitTopLevelMarkdownBlocks } from './splitMarkdownBlocks';

const ANGLE_TAG_RE = /<[^>\n]+>/g;

const INLINE_CODE_RE = /(`+)([^`\n]*?)\1/g;

/** 载入时暂存保留的 HTML 标签，避免后续对孤立 `<` 的转义误伤 `<br>` 等 */
const PRESERVED_HTML_PLACEHOLDER_PREFIX = '\uE000muled-html-';
const PRESERVED_HTML_PLACEHOLDER_SUFFIX = '\uE001';

function escapeAngleTag(raw: string): string {
  return raw.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** 解析形如 `<tag ...>`、`</tag>`、`<br/>` 的片段；无法解析则视为普通尖括号文本 */
export function parseHtmlLikeTagName(raw: string): string | null {
  if (!raw.startsWith('<') || !raw.endsWith('>')) {
    return null;
  }

  const inner = raw.slice(1, -1).trim();
  if (!inner || inner.startsWith('!')) {
    return null;
  }

  const body = inner.startsWith('/') ? inner.slice(1).trim() : inner;
  const nameMatch = body.match(/^([a-zA-Z][a-zA-Z0-9-]*)\b/);
  return nameMatch?.[1] ?? null;
}

export function shouldKeepHtmlTag(match: string): boolean {
  const name = parseHtmlLikeTagName(match);
  if (!name) {
    return false;
  }
  return isCommonHtmlTagName(name);
}

function preserveHtmlTag(match: string, preserved: string[]): string {
  const id = preserved.length;
  preserved.push(match);
  return `${PRESERVED_HTML_PLACEHOLDER_PREFIX}${id}${PRESERVED_HTML_PLACEHOLDER_SUFFIX}`;
}

function restorePreservedHtmlTags(segment: string, preserved: string[]): string {
  let result = segment;
  for (let i = 0; i < preserved.length; i += 1) {
    result = result.replace(
      `${PRESERVED_HTML_PLACEHOLDER_PREFIX}${i}${PRESERVED_HTML_PLACEHOLDER_SUFFIX}`,
      preserved[i],
    );
  }
  return result;
}

/** 将 MDX 无法当作合法标签解析的剩余 `<` 实体化（如比较符、未闭合的 `<ReadVer`） */
function escapeOrphanLessThan(segment: string): string {
  return segment.replace(/</g, '&lt;');
}

function normalizeAngleTagsInSegment(segment: string): string {
  const preserved: string[] = [];
  const afterPairs = segment.replace(ANGLE_TAG_RE, (match) => {
    if (shouldKeepHtmlTag(match)) {
      return preserveHtmlTag(match, preserved);
    }
    return escapeAngleTag(match);
  });
  const escaped = escapeOrphanLessThan(afterPairs);
  return restorePreservedHtmlTags(escaped, preserved);
}

function splitByInlineCode(text: string): { code: boolean; text: string }[] {
  const parts: { code: boolean; text: string }[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null = INLINE_CODE_RE.exec(text);

  while (match) {
    if (match.index > lastIndex) {
      parts.push({ code: false, text: text.slice(lastIndex, match.index) });
    }
    parts.push({ code: true, text: match[0] });
    lastIndex = match.index + match[0].length;
    match = INLINE_CODE_RE.exec(text);
  }

  if (lastIndex < text.length) {
    parts.push({ code: false, text: text.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ code: false, text }];
}

function normalizeBlock(block: string): string {
  const trimmedStart = block.trimStart();
  if (trimmedStart.startsWith('```') || trimmedStart.startsWith('~~~')) {
    return block;
  }

  return splitByInlineCode(block)
    .map((part) =>
      part.code ? part.text : normalizeAngleTagsInSegment(part.text),
    )
    .join('');
}

/** 将非白名单 `<...>` 转为实体，供 MDX 以普通文本渲染；仅用于 WYSIWYG 载入 */
export default function normalizeMarkdownHtmlTags(source: string): string {
  const blocks = splitTopLevelMarkdownBlocks(source);
  return blocks.map(normalizeBlock).join('\n\n');
}
