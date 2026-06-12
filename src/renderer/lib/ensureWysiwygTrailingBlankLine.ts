/** WYSIWYG 载入时在文末保留一个空行，便于继续输入 */
export function ensureWysiwygTrailingBlankLine(markdown: string): string {
  if (!markdown.trim()) {
    return '\n';
  }
  if (markdown.endsWith('\n\n')) {
    return markdown;
  }
  if (markdown.endsWith('\n')) {
    return `${markdown}\n`;
  }
  return `${markdown}\n\n`;
}
