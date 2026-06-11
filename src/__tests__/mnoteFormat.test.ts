import {
  appendMnoteEntryToContent,
  createMnoteDocument,
  formatMarkdownMnoteLoc,
  generateMnoteEntryId,
  parseMnoteDocument,
  serializeMnoteDocument,
  serializeMnoteEntry,
} from '../renderer/lib/mnoteFormat';

describe('mnoteFormat', () => {
  it('creates frontmatter for new mnote', () => {
    expect(createMnoteDocument('papers/attention.pdf')).toContain(
      'source: papers/attention.pdf',
    );
  });

  it('serializes entry with quote and body', () => {
    const block = serializeMnoteEntry({
      id: '20260611-001',
      loc: 'lines=42-58',
      created: '2026-06-11T10:00:00+08:00',
      quote: 'hello',
      body: 'my note',
    });
    expect(block).toContain('```mnote-entry');
    expect(block).toContain('loc: lines=42-58');
    expect(block).toContain('> hello');
    expect(block).toContain('my note');
  });

  it('appends entry with separator', () => {
    const base = createMnoteDocument('notes/a.md');
    const next = appendMnoteEntryToContent(base, {
      id: '20260611-001',
      loc: 'lines=1',
      body: 'first',
    });
    expect(next).toContain('---');
    expect(next).toContain('first');
  });

  it('parses mnote document', () => {
    const content = `${createMnoteDocument('notes/a.md')}${serializeMnoteEntry({
      id: '20260611-001',
      loc: 'lines=3-5',
      quote: 'quoted',
      body: 'comment',
    })}`;
    const doc = parseMnoteDocument(content);
    expect(doc?.source).toBe('notes/a.md');
    expect(doc?.entries).toHaveLength(1);
    expect(doc?.entries[0]?.quote).toBe('quoted');
    expect(doc?.entries[0]?.body).toBe('comment');
  });

  it('generates sequential ids per day', () => {
    const content = 'id: 20260611-001\nid: 20260611-002';
    const now = new Date('2026-06-11T12:00:00Z');
    expect(generateMnoteEntryId(content, now)).toBe('20260611-003');
  });

  it('formats markdown loc', () => {
    expect(formatMarkdownMnoteLoc({ start: 4, end: 4 })).toBe('lines=4');
    expect(formatMarkdownMnoteLoc({ start: 4, end: 9 })).toBe('lines=4-9');
  });

  it('serializes full document', () => {
    const content = `${createMnoteDocument('notes/a.md')}${serializeMnoteEntry({
      id: '20260611-001',
      loc: 'lines=1',
      body: 'first',
    })}`;
    const doc = parseMnoteDocument(content);
    expect(doc).not.toBeNull();
    const roundTrip = serializeMnoteDocument(doc!);
    expect(parseMnoteDocument(roundTrip)?.entries[0]?.body).toBe('first');
  });
});
