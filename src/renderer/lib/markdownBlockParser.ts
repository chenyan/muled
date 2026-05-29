import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmStrikethroughFromMarkdown } from 'mdast-util-gfm-strikethrough';
import { mdxFromMarkdown } from 'mdast-util-mdx';
import { gfmStrikethrough } from 'micromark-extension-gfm-strikethrough';
import { mdxjs } from 'micromark-extension-mdxjs';

const PARSE_OPTIONS = {
  extensions: [gfmStrikethrough(), mdxjs()],
  mdastExtensions: [gfmStrikethroughFromMarkdown(), mdxFromMarkdown()],
};

export function canParseMarkdownBlock(block: string): boolean {
  if (!block.trim()) {
    return true;
  }
  try {
    fromMarkdown(block, PARSE_OPTIONS);
    return true;
  } catch {
    return false;
  }
}
