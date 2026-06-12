import type { EditorRevealTarget, PdfRevealTarget } from '../types/tab';
import { newId } from '../../shared/id';
import type { MnoteEntry } from './mnoteFormat';
import { sha1PrefixHex } from './mnoteFingerprint';
import {
  mnoteLocToEditorReveal,
  mnoteLocToPdfReveal,
  parseMnoteLoc,
  type ParsedMdLoc,
  type ParsedMnoteLoc,
} from './mnoteLoc';

const SEARCH_RADIUS = 50;
const MAX_LINE_SPAN = 30;

function normalizeHeadingText(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

export function findMarkdownHeadingLine(
  sourceContent: string,
  heading: string,
): number | null {
  const target = normalizeHeadingText(heading);
  if (!target) return null;
  const lines = sourceContent.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i]!.match(/^#{1,6}\s+(.+)$/);
    if (match && normalizeHeadingText(match[1]!) === target) {
      return i + 1;
    }
  }
  return null;
}

function linesSlice(lines: string[], start: number, end: number): string {
  return lines.slice(start - 1, end).join('\n');
}

function matchesNeedle(
  slice: string,
  quote: string | undefined,
  fp: string | undefined,
): boolean {
  const normalizedQuote = quote?.trim();
  if (normalizedQuote) {
    const firstLine = normalizedQuote.split('\n')[0]!.trim();
    if (firstLine && slice.includes(firstLine)) return true;
  }
  if (fp && sha1PrefixHex(slice) === fp) return true;
  return !normalizedQuote && !fp;
}

function searchLineRange(
  lines: string[],
  centerStart: number,
  centerEnd: number,
  quote: string | undefined,
  fp: string | undefined,
): [number, number] | null {
  const winStart = Math.max(1, centerStart - SEARCH_RADIUS);
  const winEnd = Math.min(lines.length, centerEnd + SEARCH_RADIUS);
  const originCenter = (centerStart + centerEnd) / 2;
  const quoteLineCount = quote?.trim()
    ? quote.trim().split('\n').length
    : 1;

  let best: { range: [number, number]; score: number } | null = null;

  for (let start = winStart; start <= winEnd; start += 1) {
    const minEnd = quoteLineCount === 1 ? start : start;
    const maxEnd = Math.min(
      winEnd,
      start + Math.max(quoteLineCount - 1, MAX_LINE_SPAN - 1),
    );
    for (let end = minEnd; end <= maxEnd; end += 1) {
      const span = end - start + 1;
      if (quoteLineCount === 1 && span > 1) continue;

      const slice = linesSlice(lines, start, end);
      if (!matchesNeedle(slice, quote, fp)) continue;

      const center = (start + end) / 2;
      const dist = Math.abs(center - originCenter);
      const score = dist + span * 0.01;
      if (!best || score < best.score) {
        best = { range: [start, end], score };
      }
    }
  }

  return best?.range ?? null;
}

export function relocateMdLines(
  loc: ParsedMdLoc,
  sourceContent: string,
  quote?: string,
): [number, number] | null {
  const lines = sourceContent.split('\n');
  if (lines.length === 0) return null;

  const fp = loc.fp?.replace(/^sha1:/, '');

  if (loc.lines) {
    const [start, end] = loc.lines;
    const current = linesSlice(lines, start, end);
    if (matchesNeedle(current, quote, fp)) {
      return loc.lines;
    }
    const relocated = searchLineRange(lines, start, end, quote, fp);
    if (relocated) return relocated;
    return loc.lines;
  }

  if (quote?.trim() || fp) {
    return searchLineRange(lines, 1, lines.length, quote, fp);
  }

  return null;
}

export function isMnoteEntryLocStale(
  entry: MnoteEntry,
  sourceContent: string,
): boolean {
  const parsed = parseMnoteLoc(entry.loc);
  if (!parsed || parsed.type !== 'md') return false;
  if (!parsed.lines && !parsed.fp && !entry.quote?.trim()) return false;

  const fp = parsed.fp?.replace(/^sha1:/, '');
  if (parsed.lines) {
    const lines = sourceContent.split('\n');
    const [start, end] = parsed.lines;
    const slice = linesSlice(lines, start, end);
    if (matchesNeedle(slice, entry.quote, fp)) return false;

    const relocated = relocateMdLines(parsed, sourceContent, entry.quote);
    if (!relocated) return true;

    const relocatedSlice = linesSlice(lines, relocated[0], relocated[1]);
    return !matchesNeedle(relocatedSlice, entry.quote, fp);
  }

  if (entry.quote?.trim() || fp) {
    return relocateMdLines(parsed, sourceContent, entry.quote) === null;
  }

  return false;
}

export interface ResolvedMnoteReveal {
  parsed: ParsedMnoteLoc;
  stale: boolean;
  editorReveal: EditorRevealTarget | null;
  pdfReveal: PdfRevealTarget | null;
}

/** 有 quote 的 PDF 笔记：返回当前页应显示的 bbox 高亮 */
export function resolveMnoteQuotePdfHighlight(
  entry: MnoteEntry,
): PdfRevealTarget | null {
  if (!entry.quote?.trim()) return null;
  const parsed = parseMnoteLoc(entry.loc);
  if (parsed?.type !== 'pdf' || !parsed.bbox) return null;
  return {
    id: entry.id,
    page: parsed.page,
    bbox: parsed.bbox,
  };
}

/** 指定 PDF 页上所有带 quote+bbox 的笔记高亮 */
export function resolveMnoteQuotePdfHighlightsForPage(
  entries: MnoteEntry[],
  page: number,
): PdfRevealTarget[] {
  const highlights: PdfRevealTarget[] = [];
  for (const entry of entries) {
    const highlight = resolveMnoteQuotePdfHighlight(entry);
    if (highlight && highlight.page === page) {
      highlights.push(highlight);
    }
  }
  return highlights;
}

/** 有 quote 的 Markdown 笔记：返回应高亮的行范围 */
export function resolveMnoteQuoteEditorHighlight(
  entry: MnoteEntry,
  sourceContent: string,
): EditorRevealTarget | null {
  if (!entry.quote?.trim()) return null;
  const resolved = resolveMnoteReveal(entry, sourceContent);
  if (!resolved?.editorReveal) return null;
  return { ...resolved.editorReveal, id: entry.id };
}

export function resolveMnoteReveal(
  entry: MnoteEntry,
  sourceContent: string,
): ResolvedMnoteReveal | null {
  const parsed = parseMnoteLoc(entry.loc);
  if (!parsed) return null;

  if (parsed.type === 'pdf') {
    return {
      parsed,
      stale: false,
      editorReveal: null,
      pdfReveal: mnoteLocToPdfReveal(parsed),
    };
  }

  let anchorLines = parsed.lines;
  if (!anchorLines && parsed.heading) {
    const headingLine = findMarkdownHeadingLine(
      sourceContent,
      parsed.heading,
    );
    if (headingLine) {
      anchorLines = [headingLine, headingLine];
    }
  }

  const relocated = relocateMdLines(
    anchorLines ? { ...parsed, lines: anchorLines } : parsed,
    sourceContent,
    entry.quote,
  );
  const lines = relocated ?? anchorLines;
  const stale = isMnoteEntryLocStale(entry, sourceContent);
  if (!lines) {
    return {
      parsed,
      stale,
      editorReveal: null,
      pdfReveal: null,
    };
  }

  const [start, end] = lines;
  return {
    parsed: { ...parsed, lines },
    stale,
    editorReveal: {
      id: newId(),
      line: start,
      column: 0,
      endLine: end > start ? end : undefined,
      length: end === start ? 1 : 0,
    },
    pdfReveal: null,
  };
}
