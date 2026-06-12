import {
  appendMnoteEntryToContent,
  createMnoteDocument,
  formatMarkdownMnoteLoc,
  generateMnoteEntryId,
  parseMnoteDocument,
  serializeMnoteDocument,
  serializeMnoteEntry,
} from '../renderer/lib/mnoteFormat';
import {
  collapseMnoteEntriesFromWysiwyg,
  expandMnoteEntriesForWysiwyg,
} from '../renderer/lib/mnoteWysiwygTransform';
import { prepareMnoteForWysiwyg } from '../renderer/lib/prepareMnoteForWysiwyg';

describe('mnoteFormat', () => {
  it('creates frontmatter for new mnote', () => {
    expect(createMnoteDocument('papers/attention.pdf')).toContain(
      'source: papers/attention.pdf',
    );
  });

  it('serializes entry with quote and body inside fence', () => {
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
    expect(block.endsWith('```')).toBe(true);
  });

  it('appends entry without horizontal rule separator', () => {
    const base = createMnoteDocument('notes/a.md');
    const next = appendMnoteEntryToContent(base, {
      id: '20260611-001',
      loc: 'lines=1',
      body: 'first',
    });
    expect(next).not.toMatch(/```\n\n---\n\n```mnote-entry/);
    expect(next).toContain('first');
  });

  it('parses mnote document with content inside fence', () => {
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

  it('parses legacy format with quote and body outside fence', () => {
    const content = `${createMnoteDocument('notes/a.md')}\`\`\`mnote-entry
id: 20260611-001
loc: lines=3-5
\`\`\`

> quoted

comment
`;
    const doc = parseMnoteDocument(content);
    expect(doc?.entries[0]?.quote).toBe('quoted');
    expect(doc?.entries[0]?.body).toBe('comment');
  });

  it('parses entries with arbitrary markdown between them', () => {
    const content = `${createMnoteDocument('notes/a.md')}# Notes

${serializeMnoteEntry({
  id: '20260611-001',
  loc: 'lines=1',
  body: 'first',
})}

Some freeform markdown.

${serializeMnoteEntry({
  id: '20260611-002',
  loc: 'lines=2',
  body: 'second',
})}
`;
    const doc = parseMnoteDocument(content);
    expect(doc?.entries).toHaveLength(2);
    expect(doc?.entries[1]?.body).toBe('second');
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

  it('serializes full document from entries', () => {
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

describe('mnoteWysiwygTransform', () => {
  it('prepare keeps entries as unified fences', () => {
    const disk = serializeMnoteEntry({
      id: '20260611-001',
      loc: 'lines=1',
      quote: 'quoted',
      body: 'comment',
    });
    const prepared = prepareMnoteForWysiwyg(`${createMnoteDocument('notes/a.md')}${disk}`);
    expect(prepared).toContain('```mnote-entry');
    expect(prepared).toContain('> quoted');
    expect(prepared).not.toMatch(/```\n\n> quoted/);
    expect(prepared.endsWith('\n\n')).toBe(true);
  });

  it('collapses wysiwyg format back to disk format', () => {
    const disk = serializeMnoteEntry({
      id: '20260611-001',
      loc: 'lines=1',
      quote: 'quoted',
      body: 'comment',
    });
    const expanded = expandMnoteEntriesForWysiwyg(disk);
    const collapsed = collapseMnoteEntriesFromWysiwyg(expanded);
    const doc = parseMnoteDocument(`${createMnoteDocument('notes/a.md')}${collapsed}`);
    expect(doc?.entries[0]?.quote).toBe('quoted');
    expect(doc?.entries[0]?.body).toBe('comment');
  });

  it('preserves arbitrary markdown when collapsing', () => {
    const expanded = `# Intro

\`\`\`mnote-entry
id: 20260611-001
loc: lines=1
\`\`\`

> quoted

comment

Freeform paragraph.
`;
    const collapsed = collapseMnoteEntriesFromWysiwyg(expanded);
    expect(collapsed).toContain('# Intro');
    expect(collapsed).toContain('Freeform paragraph.');
    expect(collapsed).toMatch(/```mnote-entry[\s\S]*> quoted[\s\S]*```/);
  });
});
