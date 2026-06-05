import { isCommonHtmlTagName } from './commonHtmlTagNames';
import { replaceInlineMathDelimiters } from './inlineMathDelimiters';

const ANGLE_TAG_RE = /<[^>\n]+>/g;

const INLINE_CODE_RE = /(`+)([^`\n]*?)\1/g;

const PRESERVED_HTML_PLACEHOLDER_PREFIX = '\uE000muled-html-';
const PRESERVED_HTML_PLACEHOLDER_SUFFIX = '\uE001';

/** MDX JSX 要求自闭合的 void 元素（PMC 等来源常写 <hr> 而非 <hr />） */
const VOID_HTML_OPEN_TAG_RE =
  /<(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)\b([^>/]*?)>/gi;

/** 将 HTML 表格块内的 * 转为实体，避免 mdxMd 把 significance stars 当成 emphasis */
export function normalizeMdxJsxHtmlTableAsterisks(html: string): string {
  if (!/<table\b/i.test(html)) {
    return html;
  }
  return html.replace(/\*/g, '&#42;');
}

export function normalizeVoidHtmlOpenTags(html: string): string {
  return html.replace(VOID_HTML_OPEN_TAG_RE, '<$1$2 />');
}

/** WYSIWYG 载入：使嵌入 HTML 通过 MDXEditor（mdxJsx/mdxMd）解析 */
export function normalizeHtmlForMdxJsx(html: string): string {
  return normalizeMdxJsxHtmlTableAsterisks(normalizeVoidHtmlOpenTags(html));
}

function normalizeDisplayMathDelimiters(block: string): string {
  return block.replace(
    /^\$\$([\s\S]*?)\$\$/gm,
    (_, content: string) => `\`\`\`math\n${content.trim()}\n\`\`\``,
  );
}

function normalizeInlineMathDelimiters(block: string): string {
  return replaceInlineMathDelimiters(block);
}

function escapeAngleTag(raw: string): string {
  return raw.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

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
  preserved.push(normalizeVoidHtmlOpenTags(match));
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
  const restored = restorePreservedHtmlTags(escaped, preserved);
  return normalizeMdxJsxHtmlTableAsterisks(restored);
}

function splitByInlineCode(text: string): { code: boolean; text: string }[] {
  const parts: { code: boolean; text: string }[] = [];
  let lastIndex = 0;
  INLINE_CODE_RE.lastIndex = 0;
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

export function isMarkdownFenceBlock(block: string): boolean {
  const trimmedStart = block.trimStart();
  return trimmedStart.startsWith('```') || trimmedStart.startsWith('~~~');
}

/** 单块：公式 delimiter 归一化（跳过围栏代码块） */
export function normalizeMarkdownBlockMath(block: string): string {
  if (isMarkdownFenceBlock(block)) {
    return block;
  }
  const normalized = normalizeDisplayMathDelimiters(block);
  return splitByInlineCode(normalized)
    .map((part) =>
      part.code ? part.text : normalizeInlineMathDelimiters(part.text),
    )
    .join('');
}

/** 单块：HTML 尖括号处理（跳过围栏代码块） */
export function normalizeMarkdownBlockHtml(block: string): string {
  if (isMarkdownFenceBlock(block)) {
    return block;
  }
  return splitByInlineCode(block)
    .map((part) =>
      part.code ? part.text : normalizeAngleTagsInSegment(part.text),
    )
    .join('');
}

/** 单块：公式 + HTML，一次遍历（WYSIWYG 载入用） */
export function normalizeMarkdownBlockMathAndHtml(block: string): string {
  if (isMarkdownFenceBlock(block)) {
    return block;
  }
  const withDisplayMath = normalizeDisplayMathDelimiters(block);
  const withInlineMath = splitByInlineCode(withDisplayMath)
    .map((part) =>
      part.code ? part.text : normalizeInlineMathDelimiters(part.text),
    )
    .join('');
  return splitByInlineCode(withInlineMath)
    .map((part) =>
      part.code ? part.text : normalizeAngleTagsInSegment(part.text),
    )
    .join('');
}
