import { prepareMarkdownForWysiwyg } from './prepareMarkdownForWysiwyg';

/** WYSIWYG 载入：复用 Markdown 管线（frontmatter 表格化、wiki 链接等） */
export function prepareMnoteForWysiwyg(raw: string): string {
  return prepareMarkdownForWysiwyg(raw);
}
