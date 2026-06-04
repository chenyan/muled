import { splitTopLevelMarkdownBlocks } from './splitMarkdownBlocks';
import {
  normalizeMarkdownBlockHtml,
  parseHtmlLikeTagName,
  shouldKeepHtmlTag,
} from './wysiwygBlockNormalize';

export { parseHtmlLikeTagName, shouldKeepHtmlTag };

/** 将非白名单 `<...>` 转为实体，供 MDX 以普通文本渲染；仅用于 WYSIWYG 载入 */
export default function normalizeMarkdownHtmlTags(source: string): string {
  const blocks = splitTopLevelMarkdownBlocks(source);
  return blocks.map(normalizeMarkdownBlockHtml).join('\n\n');
}
