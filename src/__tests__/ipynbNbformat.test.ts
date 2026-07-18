import {
  createEmptyNotebook,
  denormalizeCellSource,
  normalizeCellSource,
  parseIpynbJson,
  serializeIpynb,
} from '../shared/ipynb/nbformat';

describe('ipynb nbformat', () => {
  it('normalizes source arrays and strings', () => {
    expect(normalizeCellSource(['print(1)\n', 'print(2)'])).toBe(
      'print(1)\nprint(2)',
    );
    expect(normalizeCellSource('hello')).toBe('hello');
    expect(denormalizeCellSource('a\nb')).toEqual(['a\n', 'b']);
  });

  it('parses and serializes a minimal notebook', () => {
    const raw = JSON.stringify(
      {
        nbformat: 4,
        nbformat_minor: 5,
        metadata: {
          kernelspec: {
            display_name: 'Python 3',
            language: 'python',
            name: 'python3',
          },
          language_info: { name: 'python', version: '3.11.0' },
        },
        cells: [
          {
            cell_type: 'markdown',
            metadata: {},
            source: ['# Title\n'],
          },
          {
            cell_type: 'code',
            execution_count: 1,
            metadata: {},
            outputs: [
              {
                output_type: 'stream',
                name: 'stdout',
                text: ['hello\n'],
              },
            ],
            source: ['print("hello")\n'],
          },
        ],
      },
      null,
      1,
    );

    const doc = parseIpynbJson(raw);
    expect(doc.cells).toHaveLength(2);
    expect(doc.cells[0].cell_type).toBe('markdown');
    expect(doc.cells[0].source).toBe('# Title\n');
    expect(doc.cells[1].execution_count).toBe(1);
    expect(doc.cells[0].id).toBeTruthy();
    expect(doc.cells[1].id).toBeTruthy();

    const roundTrip = serializeIpynb(doc);
    const reparsed = parseIpynbJson(roundTrip);
    expect(reparsed.cells[0].source).toBe('# Title\n');
    expect(reparsed.cells[1].outputs?.[0]?.text).toEqual(['hello\n']);
  });

  it('creates an empty notebook with a blank code cell', () => {
    const doc = createEmptyNotebook('python');
    expect(doc.cells).toHaveLength(1);
    expect(doc.cells[0].cell_type).toBe('code');
    expect(doc.metadata.kernelspec?.language).toBe('python');
  });

  it('adds a blank cell when cells array is empty', () => {
    const raw = JSON.stringify({
      nbformat: 4,
      nbformat_minor: 5,
      metadata: {},
      cells: [],
    });
    const doc = parseIpynbJson(raw);
    expect(doc.cells).toHaveLength(1);
    expect(doc.cells[0].cell_type).toBe('code');
  });
});
