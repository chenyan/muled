import {
  csvColumnHeader,
  gridRowsToMatrix,
  matrixToGridRows,
  parseCsv,
  serializeCsv,
} from '../renderer/lib/csv';

describe('csv', () => {
  it('parses simple rows', () => {
    expect(parseCsv('a,b\n1,2')).toEqual([
      [{ value: 'a' }, { value: 'b' }],
      [{ value: '1' }, { value: '2' }],
    ]);
  });

  it('parses quoted fields with commas and escaped quotes', () => {
    expect(parseCsv('"a,b","c""d"\n2,3')).toEqual([
      [{ value: 'a,b' }, { value: 'c"d' }],
      [{ value: '2' }, { value: '3' }],
    ]);
  });

  it('parses multiline quoted fields', () => {
    expect(parseCsv('"line1\nline2",b')).toEqual([
      [{ value: 'line1\nline2' }, { value: 'b' }],
    ]);
  });

  it('serializes fields that need quoting', () => {
    expect(
      serializeCsv([
        [{ value: 'a,b' }, { value: 'c"d' }],
        [{ value: '2' }, { value: '3' }],
      ]),
    ).toBe('"a,b","c""d"\n2,3');
  });

  it('round-trips through parse and serialize', () => {
    const source = 'name,note\nAlice,"hello, world"\nBob,"say ""hi"""';
    expect(serializeCsv(parseCsv(source))).toBe(source);
  });

  it('returns a single empty cell for empty input', () => {
    expect(parseCsv('')).toEqual([[{ value: '' }]]);
    expect(serializeCsv(parseCsv(''))).toBe('');
  });

  it('converts matrix to grid rows and back', () => {
    const matrix = parseCsv('a,b\n1,2');
    const rows = matrixToGridRows(matrix);
    expect(rows).toEqual([
      { id: 0, c0: 'a', c1: 'b' },
      { id: 1, c0: '1', c1: '2' },
    ]);
    expect(gridRowsToMatrix(rows, 2)).toEqual(matrix);
  });

  it('generates excel-style column headers', () => {
    expect(csvColumnHeader(0)).toBe('A');
    expect(csvColumnHeader(25)).toBe('Z');
    expect(csvColumnHeader(26)).toBe('AA');
  });
});
