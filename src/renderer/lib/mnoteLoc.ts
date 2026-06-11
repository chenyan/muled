import { newId } from '../../shared/id';
import type { EditorRevealTarget, PdfRevealTarget } from '../types/tab';
import type { MnoteEntry } from './mnoteFormat';

export interface ParsedMdLoc {
  type: 'md';
  lines?: [number, number];
  heading?: string;
  block?: string;
  fp?: string;
}

export interface ParsedPdfLoc {
  type: 'pdf';
  page: number;
  bbox?: [number, number, number, number];
  text?: string;
}

export type ParsedMnoteLoc = ParsedMdLoc | ParsedPdfLoc;

function parseLocPairs(loc: string): Record<string, string> {
  const pairs: Record<string, string> = {};
  for (const part of loc.split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/\\;/g, ';');
    if (key) pairs[key] = value;
  }
  return pairs;
}

function parseLinesValue(raw: string): [number, number] | undefined {
  const dash = raw.indexOf('-');
  if (dash >= 0) {
    const start = Number(raw.slice(0, dash));
    const end = Number(raw.slice(dash + 1));
    if (Number.isFinite(start) && Number.isFinite(end) && start > 0 && end > 0) {
      return [Math.min(start, end), Math.max(start, end)];
    }
    return undefined;
  }
  const single = Number(raw);
  if (Number.isFinite(single) && single > 0) {
    return [single, single];
  }
  return undefined;
}

function parseBboxValue(raw: string): [number, number, number, number] | undefined {
  const parts = raw.split(',').map((v) => Number(v.trim()));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
    return undefined;
  }
  return parts as [number, number, number, number];
}

/** embedpdf 选区为 0-based pageIndex；滚动/API 为 1-based pageNumber */
export function normalizePdfPageNumber(raw: number): number | null {
  if (!Number.isFinite(raw) || raw < 0) return null;
  const page = Math.floor(raw);
  return page === 0 ? 1 : page;
}

export function parseMnoteLoc(loc: string): ParsedMnoteLoc | null {
  const pairs = parseLocPairs(loc);
  if ('page' in pairs) {
    const page = normalizePdfPageNumber(Number(pairs.page));
    if (page === null) return null;
    const bbox = pairs.bbox ? parseBboxValue(pairs.bbox) : undefined;
    return {
      type: 'pdf',
      page,
      bbox,
      text: pairs.text,
    };
  }

  if ('lines' in pairs || 'heading' in pairs || 'block' in pairs) {
    const lines = pairs.lines ? parseLinesValue(pairs.lines) : undefined;
    return {
      type: 'md',
      lines,
      heading: pairs.heading,
      block: pairs.block,
      fp: pairs.fp,
    };
  }

  return null;
}

export function mnoteLocToEditorReveal(loc: ParsedMnoteLoc): EditorRevealTarget | null {
  if (loc.type !== 'md' || !loc.lines) return null;
  const [start, end] = loc.lines;
  return {
    id: newId(),
    line: start,
    column: 0,
    endLine: end > start ? end : undefined,
    length: end === start ? 1 : 0,
  };
}

export function mnoteLocToPdfReveal(loc: ParsedMnoteLoc): PdfRevealTarget | null {
  if (loc.type !== 'pdf') return null;
  return {
    id: newId(),
    page: loc.page,
    bbox: loc.bbox,
  };
}

export function findEntryForMarkdownLine(
  entries: MnoteEntry[],
  line: number,
): MnoteEntry | null {
  for (const entry of entries) {
    const parsed = parseMnoteLoc(entry.loc);
    if (parsed?.type !== 'md' || !parsed.lines) continue;
    const [start, end] = parsed.lines;
    if (line >= start && line <= end) {
      return entry;
    }
  }
  return null;
}

export function findEntryForPdfPage(
  entries: MnoteEntry[],
  page: number,
): MnoteEntry | null {
  const onPage = entries.filter((entry) => {
    const parsed = parseMnoteLoc(entry.loc);
    return parsed?.type === 'pdf' && parsed.page === page;
  });
  if (onPage.length > 0) return onPage[0]!;
  return null;
}
