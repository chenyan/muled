import {
  findEntryForMarkdownLine,
  findEntryForPdfPage,
  mnoteLocToEditorReveal,
  mnoteLocToPdfReveal,
  parseMnoteLoc,
} from '../renderer/lib/mnoteLoc';
import type { MnoteEntry } from '../renderer/lib/mnoteFormat';

describe('mnoteLoc', () => {
  it('parses markdown lines loc', () => {
    expect(parseMnoteLoc('lines=42-58')).toEqual({
      type: 'md',
      lines: [42, 58],
    });
  });

  it('parses pdf page and bbox', () => {
    expect(parseMnoteLoc('page=7; bbox=0.1,0.2,0.9,0.5')).toEqual({
      type: 'pdf',
      page: 7,
      bbox: [0.1, 0.2, 0.9, 0.5],
    });
  });

  it('normalizes legacy 0-based pdf page loc', () => {
    expect(parseMnoteLoc('page=0; fp=sha1:3f1d3c52')).toEqual({
      type: 'pdf',
      page: 1,
    });
  });

  it('converts md loc to editor reveal', () => {
    const reveal = mnoteLocToEditorReveal({
      type: 'md',
      lines: [10, 12],
    });
    expect(reveal?.line).toBe(10);
    expect(reveal?.endLine).toBe(12);
  });

  it('converts pdf loc to pdf reveal', () => {
    const reveal = mnoteLocToPdfReveal({
      type: 'pdf',
      page: 3,
      bbox: [0, 0, 1, 1],
    });
    expect(reveal?.page).toBe(3);
    expect(reveal?.bbox).toEqual([0, 0, 1, 1]);
  });

  it('finds entry for markdown line', () => {
    const entries: MnoteEntry[] = [
      { id: 'a', loc: 'lines=1-5', body: '' },
      { id: 'b', loc: 'lines=20-25', body: '' },
    ];
    expect(findEntryForMarkdownLine(entries, 22)?.id).toBe('b');
  });

  it('finds entry for pdf page', () => {
    const entries: MnoteEntry[] = [
      { id: 'a', loc: 'page=1', body: '' },
      { id: 'b', loc: 'page=4; bbox=0,0,1,1', body: '' },
    ];
    expect(findEntryForPdfPage(entries, 4)?.id).toBe('b');
  });
});
