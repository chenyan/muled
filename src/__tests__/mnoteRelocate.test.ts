import type { MnoteEntry } from '../renderer/lib/mnoteFormat';
import {
  findMarkdownHeadingLine,
  isMnoteEntryLocStale,
  relocateMdLines,
  resolveMnoteQuoteEditorHighlight,
  resolveMnoteQuotePdfHighlight,
  resolveMnoteQuotePdfHighlightsForPage,
  resolveMnoteReveal,
} from '../renderer/lib/mnoteRelocate';
import { appendFingerprintToLoc } from '../renderer/lib/mnoteFingerprint';

describe('mnoteRelocate', () => {
  const source = ['line1', 'alpha beta', 'line3', 'gamma', 'line5'].join('\n');

  it('relocates by quote when lines shifted', () => {
    const shifted = ['intro', 'line1', 'alpha beta', 'line3'].join('\n');
    const entry: MnoteEntry = {
      id: '1',
      loc: 'lines=2-2',
      quote: 'alpha beta',
      body: '',
    };
    const parsed = { type: 'md' as const, lines: [2, 2] as [number, number] };
    expect(relocateMdLines(parsed, shifted, entry.quote)).toEqual([3, 3]);
  });

  it('marks stale when quote missing', () => {
    const entry: MnoteEntry = {
      id: '1',
      loc: appendFingerprintToLoc('lines=2-2', 'alpha beta'),
      quote: 'alpha beta',
      body: '',
    };
    const mutated = source.replace('alpha beta', 'changed');
    expect(isMnoteEntryLocStale(entry, mutated)).toBe(true);
  });

  it('finds heading line in markdown source', () => {
    const md = '# Intro\n\n## Section A\n\nbody';
    expect(findMarkdownHeadingLine(md, 'Section A')).toBe(3);
  });

  it('resolves pdf reveal from legacy page=0 loc', () => {
    const entry: MnoteEntry = {
      id: '20260611-001',
      loc: 'page=0; fp=sha1:3f1d3c52',
      quote:
        'The main goal of this paper is to introduce techniques that can be used for learning high-quality word',
      body: '模型表征',
    };
    const resolved = resolveMnoteReveal(entry, '');
    expect(resolved?.pdfReveal?.page).toBe(1);
    expect(resolved?.pdfReveal?.bbox).toBeUndefined();
  });

  it('resolves reveal from heading loc', () => {
    const md = '# Intro\n\n## Target\n\nbody';
    const entry: MnoteEntry = {
      id: '1',
      loc: 'heading=Target',
      body: '',
    };
    const resolved = resolveMnoteReveal(entry, md);
    expect(resolved?.editorReveal?.line).toBe(3);
  });

  it('resolves quote pdf highlight from bbox loc', () => {
    const entry: MnoteEntry = {
      id: 'a',
      loc: 'page=2; bbox=0.1,0.2,0.9,0.5',
      quote: 'selected text',
      body: '',
    };
    expect(resolveMnoteQuotePdfHighlight(entry)).toEqual({
      id: 'a',
      page: 2,
      bbox: [0.1, 0.2, 0.9, 0.5],
    });
  });

  it('collects all quote pdf highlights on a page', () => {
    const entries: MnoteEntry[] = [
      {
        id: 'a',
        loc: 'page=2; bbox=0.1,0.2,0.4,0.3',
        quote: 'one',
        body: '',
      },
      {
        id: 'b',
        loc: 'page=2; bbox=0.5,0.2,0.9,0.3',
        quote: 'two',
        body: '',
      },
      {
        id: 'c',
        loc: 'page=3; bbox=0,0,1,1',
        quote: 'other page',
        body: '',
      },
      { id: 'd', loc: 'page=2', quote: 'no bbox', body: '' },
    ];
    expect(resolveMnoteQuotePdfHighlightsForPage(entries, 2)).toEqual([
      {
        id: 'a',
        page: 2,
        bbox: [0.1, 0.2, 0.4, 0.3],
      },
      {
        id: 'b',
        page: 2,
        bbox: [0.5, 0.2, 0.9, 0.3],
      },
    ]);
  });

  it('skips quote pdf highlight without bbox', () => {
    const entry: MnoteEntry = {
      id: 'a',
      loc: 'page=2; text=selected',
      quote: 'selected text',
      body: '',
    };
    expect(resolveMnoteQuotePdfHighlight(entry)).toBeNull();
  });

  it('resolves quote editor highlight from relocated lines', () => {
    const shifted = ['intro', 'line1', 'alpha beta', 'line3'].join('\n');
    const entry: MnoteEntry = {
      id: '1',
      loc: 'lines=2-2',
      quote: 'alpha beta',
      body: '',
    };
    expect(resolveMnoteQuoteEditorHighlight(entry, shifted)?.line).toBe(3);
  });

  it('resolves reveal with relocated lines', () => {
    const shifted = ['intro', 'line1', 'alpha beta', 'line3'].join('\n');
    const entry: MnoteEntry = {
      id: '1',
      loc: 'lines=2-2',
      quote: 'alpha beta',
      body: '',
    };
    const resolved = resolveMnoteReveal(entry, shifted);
    expect(resolved?.editorReveal?.line).toBe(3);
    expect(resolved?.stale).toBe(false);
  });
});
