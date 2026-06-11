import type { EditorTab } from '../types/tab';
import {
  formatMarkdownMnoteLoc,
  linesFromCharRange,
} from './mnoteFormat';

interface SourceLineReader {
  getSelectionLines: () => { start: number; end: number };
  getCursorLine: () => number;
}

interface BuildMarkdownMnoteLocOptions {
  tab: EditorTab;
  sourceRef: SourceLineReader | null;
  selectionText: string;
  sourceRange: { from: number; to: number } | null;
  content: string;
}

export function buildMarkdownMnoteLoc({
  tab,
  sourceRef,
  selectionText,
  sourceRange,
  content,
}: BuildMarkdownMnoteLocOptions): string {
  if (tab.viewMode === 'source' && sourceRef) {
    const lines = sourceRef.getSelectionLines();
    return formatMarkdownMnoteLoc(lines);
  }

  if (sourceRange && selectionText.trim()) {
    const lines = linesFromCharRange(content, sourceRange.from, sourceRange.to);
    return formatMarkdownMnoteLoc(lines);
  }

  if (tab.viewMode === 'source' && sourceRef) {
    const line = sourceRef.getCursorLine();
    return formatMarkdownMnoteLoc({ start: line, end: line });
  }

  return 'lines=1';
}
