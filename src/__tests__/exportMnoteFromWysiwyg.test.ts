import { exportMnoteFromWysiwyg } from '../renderer/lib/exportMnoteFromWysiwyg';
import {
  createMnoteDocument,
  parseMnoteDocument,
  serializeMnoteEntry,
} from '../renderer/lib/mnoteFormat';
import { prepareMnoteForWysiwyg } from '../renderer/lib/prepareMnoteForWysiwyg';

describe('exportMnoteFromWysiwyg', () => {
  const sample = `${createMnoteDocument('notes/a.md')}${serializeMnoteEntry({
    id: '20260611-001',
    loc: 'lines=3-5',
    created: '2026-06-11T10:00:00+08:00',
    label: '要点',
    quote: 'quoted line',
    body: 'my comment',
  })}`;

  it('round-trips through prepare and export', () => {
    const prepared = prepareMnoteForWysiwyg(sample);
    const exported = exportMnoteFromWysiwyg(prepared, sample);
    const doc = parseMnoteDocument(exported);
    expect(doc?.source).toBe('notes/a.md');
    expect(doc?.entries).toHaveLength(1);
    expect(doc?.entries[0]?.id).toBe('20260611-001');
    expect(doc?.entries[0]?.label).toBe('要点');
    expect(doc?.entries[0]?.quote).toBe('quoted line');
    expect(doc?.entries[0]?.body).toBe('my comment');
  });

  it('preserves multiple entries separated by horizontal rules', () => {
    const multi = `${sample}\n\n---\n\n${serializeMnoteEntry({
      id: '20260611-002',
      loc: 'lines=10',
      body: 'second',
    })}`;
    const prepared = prepareMnoteForWysiwyg(multi);
    const exported = exportMnoteFromWysiwyg(prepared, multi);
    const doc = parseMnoteDocument(exported);
    expect(doc?.entries).toHaveLength(2);
    expect(doc?.entries[1]?.body).toBe('second');
  });
});
