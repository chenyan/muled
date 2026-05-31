import { splitTopLevelMarkdownBlocks } from './splitMarkdownBlocks';

const MATH_FENCE_OPEN =
  /^(`{3,}|~{3,})(math|latex|tex|katex)(\s*)$/i;

/** 载入期 normalizeMarkdownMath 写入的 MDX JSX 行内公式 */
const INLINE_MATH_SPAN_RE =
  /<span\s+data-muled-math=(?:"([^"]*)"|'([^']*)')\s*(?:\/>|><\/span>|>)/gi;

function unescapeHtmlAttr(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&');
}

/** 将泄漏的 `<span data-muled-math>` 还原为 `$...$` */
export function denormalizeInlineMathSpans(source: string): string {
  return source.replace(INLINE_MATH_SPAN_RE, (_, doubleQuoted, singleQuoted) => {
    const latex = unescapeHtmlAttr(doubleQuoted ?? singleQuoted ?? '');
    return `$${latex}$`;
  });
}

function shouldKeepMathFences(original?: string): boolean {
  if (!original) {
    return false;
  }
  const hasMathFence = /```math\b/i.test(original);
  const hasDollarDisplay = /\$\$/.test(original);
  return hasMathFence && !hasDollarDisplay;
}

function extractMathFenceContent(
  block: string,
): { content: string; lang: string } | null {
  const lines = block.split('\n');
  const openMatch = lines[0]?.match(MATH_FENCE_OPEN);
  if (!openMatch) {
    return null;
  }

  const fenceChar = openMatch[1][0];
  const openLen = openMatch[1].length;
  const lang = openMatch[2].toLowerCase();
  const contentLines: string[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    const closeRe = new RegExp(`^\\${fenceChar}{${openLen},}\\s*$`);
    if (closeRe.test(line)) {
      return { content: contentLines.join('\n'), lang };
    }
    contentLines.push(line);
  }

  return null;
}

function mathFenceToDollarDelimiters(content: string): string {
  if (content.includes('\n')) {
    return `$$\n${content}\n$$`;
  }
  return `$$${content.trim()}$$`;
}

function denormalizeMathFenceBlock(block: string): string {
  const extracted = extractMathFenceContent(block);
  if (!extracted || extracted.lang !== 'math') {
    return block;
  }
  return mathFenceToDollarDelimiters(extracted.content);
}

/** 将 WYSIWYG 内部的 ```math 块还原为磁盘常用的 $$ 定界符 */
export function denormalizeMarkdownMath(
  source: string,
  original?: string,
): string {
  if (shouldKeepMathFences(original)) {
    return source;
  }

  const blocks = splitTopLevelMarkdownBlocks(source);
  return blocks
    .map((block) => {
      const trimmedStart = block.trimStart();
      if (
        trimmedStart.startsWith('```') ||
        trimmedStart.startsWith('~~~')
      ) {
        return denormalizeMathFenceBlock(block);
      }
      return block;
    })
    .join('\n\n');
}
