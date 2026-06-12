import { normalizeMarkdownFrontmatterForWysiwyg } from './markdownFrontmatter';
import normalizeMarkdownHtmlTags from './normalizeMarkdownHtmlTags';
import normalizeMarkdownMath from './normalizeMarkdownMath';
import { normalizeMarkdownWikiImages } from './normalizeMarkdownWikiImages';
import { normalizeMarkdownWikiLinks } from './normalizeMarkdownWikiLinks';
import { splitTopLevelMarkdownBlocks } from './splitMarkdownBlocks';
import { normalizeMarkdownBlockMathAndHtml } from './wysiwygBlockNormalize';
import { ensureWysiwygTrailingBlankLine } from './ensureWysiwygTrailingBlankLine';

function joinPreparedBlocks(blocks: string[], fallback: string): string {
  if (blocks.length === 0 && !fallback.trim()) {
    return fallback;
  }
  return blocks.map(normalizeMarkdownBlockMathAndHtml).join('\n\n');
}

/** WYSIWYG 载入：frontmatter 表格化 → 块拆分 + math/html 合并，再处理 wiki 图片/链接 */
export function prepareMarkdownForWysiwyg(raw: string): string {
  const withoutFrontmatter = normalizeMarkdownFrontmatterForWysiwyg(raw);
  const blocks = splitTopLevelMarkdownBlocks(withoutFrontmatter);
  const body = joinPreparedBlocks(blocks, withoutFrontmatter);
  return ensureWysiwygTrailingBlankLine(
    normalizeMarkdownWikiLinks(normalizeMarkdownWikiImages(body)),
  );
}

/**
 * 旧版四次全篇归一化（两次块拆分），仅供基准对比。
 * @visibleForTesting
 */
export function prepareMarkdownForWysiwygLegacy(raw: string): string {
  return normalizeMarkdownWikiLinks(
    normalizeMarkdownWikiImages(
      normalizeMarkdownHtmlTags(normalizeMarkdownMath(raw)),
    ),
  );
}
