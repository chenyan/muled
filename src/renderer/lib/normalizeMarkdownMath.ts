import { splitTopLevelMarkdownBlocks } from './splitMarkdownBlocks';

/** 行内公式：$a$ 且非 $$ */
const INLINE_MATH_RE = /(?<!\$)\$(?!\$)((?:\\.|[^$\\\n])+?)\$(?!\$)/g;

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function normalizeDisplayMathDelimiters(block: string): string {
  return block.replace(
    /^\$\$([\s\S]*?)\$\$/gm,
    (_, content: string) => `\`\`\`math\n${content.trim()}\n\`\`\``,
  );
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
        return block;
      }
      let normalized = normalizeDisplayMathDelimiters(block);
      normalized = normalizeInlineMathDelimiters(normalized);
      return normalized;
    })
    .join('\n\n');
}
