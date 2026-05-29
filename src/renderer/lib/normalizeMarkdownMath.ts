import { splitTopLevelMarkdownBlocks } from './splitMarkdownBlocks';

const MATH_FENCE_LANG = /^(`{3,}|~{3,})(latex|tex|katex)(\s*)$/im;

/** 行内公式：$a$ 且非 $$ */
const INLINE_MATH_RE = /(?<!\$)\$(?!\$)((?:\\.|[^$\\\n])+?)\$(?!\$)/g;

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function normalizeMathFenceLanguage(block: string): string {
  const lines = block.split('\n');
  if (lines.length === 0 || !lines[0].match(/^(`{3,}|~{3,})/)) {
    return block;
  }
  lines[0] = lines[0].replace(MATH_FENCE_LANG, '$1math$3');
  return lines.join('\n');
}

function normalizeDisplayMathDelimiters(block: string): string {
  let result = block.replace(
    /^\$\$\s*\n([\s\S]*?)\n\s*\$\$/gm,
    (_, content: string) => `\`\`\`math\n${content.trim()}\n\`\`\``,
  );
  result = result.replace(
    /^\$\$([^\n$]+?)\$\$/gm,
    (_, content: string) => `\`\`\`math\n${content.trim()}\n\`\`\``,
  );
  return result;
}

function normalizeInlineMathDelimiters(block: string): string {
  return block.replace(
    INLINE_MATH_RE,
    (_, latex: string) =>
      `<span data-muled-math="${escapeHtmlAttr(latex)}"></span>`,
  );
}

/** 将常见公式写法转为 MDXEditor 可渲染的 math 块 / 行内 span */
export default function normalizeMarkdownMath(source: string): string {
  const blocks = splitTopLevelMarkdownBlocks(source);
  return blocks
    .map((block) => {
      const trimmedStart = block.trimStart();
      if (trimmedStart.startsWith('```') || trimmedStart.startsWith('~~~')) {
        return normalizeMathFenceLanguage(block);
      }
      let normalized = normalizeDisplayMathDelimiters(block);
      normalized = normalizeInlineMathDelimiters(normalized);
      return normalized;
    })
    .join('\n\n');
}
