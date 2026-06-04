import { splitTopLevelMarkdownBlocks } from './splitMarkdownBlocks';
import { normalizeMarkdownBlockMath } from './wysiwygBlockNormalize';

/** 将常见公式写法转为 MDXEditor 可渲染的 math 块 / 行内 span */
export default function normalizeMarkdownMath(source: string): string {
  const blocks = splitTopLevelMarkdownBlocks(source);
  return blocks.map(normalizeMarkdownBlockMath).join('\n\n');
}
