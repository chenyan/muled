import { formatMarkdownMnoteLoc, linesFromCharRange } from './mnoteFormat';

export function buildHtmlPreviewMnoteLoc(
  sourceContent: string,
  selectionText: string,
): string {
  const trimmed = selectionText.trim();
  if (!trimmed) return 'preview=html';
  const index = sourceContent.indexOf(trimmed);
  if (index >= 0) {
    const lines = linesFromCharRange(
      sourceContent,
      index,
      index + trimmed.length,
    );
    return formatMarkdownMnoteLoc(lines);
  }
  return 'preview=html';
}
