import { splitTopLevelMarkdownBlocks } from './splitMarkdownBlocks';

/** 载入时由 normalizeMarkdownHtmlTags 写入的实体化书名号等 */
const ESCAPED_ANGLE_TAG_RE = /&lt;([^&\n]+?)&gt;/g;

function denormalizeEscapedAngleTags(segment: string): string {
  return segment
    .replace(ESCAPED_ANGLE_TAG_RE, '<$1>')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function denormalizeBlock(block: string): string {
  const trimmedStart = block.trimStart();
  if (trimmedStart.startsWith('```') || trimmedStart.startsWith('~~~')) {
    return block;
  }
  return denormalizeEscapedAngleTags(block);
}

/** 将 WYSIWYG 内的实体化尖括号还原为磁盘上的 `<...>` 字面量 */
export function denormalizeMarkdownHtmlTags(source: string): string {
  const blocks = splitTopLevelMarkdownBlocks(source);
  return blocks.map(denormalizeBlock).join('\n\n');
}

export default denormalizeMarkdownHtmlTags;
