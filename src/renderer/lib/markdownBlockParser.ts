import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmStrikethroughFromMarkdown } from 'mdast-util-gfm-strikethrough';
import { mdxJsxFromMarkdown } from 'mdast-util-mdx-jsx';
import { mdxFromMarkdown } from 'mdast-util-mdx';
import { gfmStrikethrough } from 'micromark-extension-gfm-strikethrough';
import { mdxjs } from 'micromark-extension-mdxjs';
import { mdxJsx } from 'micromark-extension-mdx-jsx';
import { mdxMd } from 'micromark-extension-mdx-md';

/** 与 MDXEditor core（suppressHtmlProcessing=false）对齐，用于 recovery 判定 */
const MDX_EDITOR_PARSE_OPTIONS = {
  extensions: [gfmStrikethrough(), mdxJsx(), mdxMd()],
  mdastExtensions: [gfmStrikethroughFromMarkdown(), mdxJsxFromMarkdown()],
};

/** 旧版 mdxjs 解析（部分测试与兼容路径） */
const LEGACY_PARSE_OPTIONS = {
  extensions: [gfmStrikethrough(), mdxjs()],
  mdastExtensions: [gfmStrikethroughFromMarkdown(), mdxFromMarkdown()],
};

function tryParseMarkdown(
  block: string,
  options: typeof MDX_EDITOR_PARSE_OPTIONS,
): boolean {
  if (!block.trim()) {
    return true;
  }
  try {
    fromMarkdown(block, options);
    return true;
  } catch {
    return false;
  }
}

export function canParseMarkdownBlock(block: string): boolean {
  return tryParseMarkdown(block, MDX_EDITOR_PARSE_OPTIONS);
}

/** @visibleForTesting */
export function canParseMarkdownBlockLegacy(block: string): boolean {
  return tryParseMarkdown(block, LEGACY_PARSE_OPTIONS);
}
