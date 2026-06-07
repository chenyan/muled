import { parseCsv } from '../renderer/lib/csv';
import {
  csvDuckdbColumnName,
  sniffCsv,
  sniffCsvMatrix,
} from '../renderer/lib/csvSniffer';

describe('csvSniffer', () => {
  it('detects header when first row fails type cast', () => {
    const rows = [
      ['Name', 'Age'],
      ['', ''],
      ['Jack Black', '54'],
      ['Kyle Gass', '63.2'],
    ];
    const result = sniffCsv(rows);

    expect(result.hasHeader).toBe(true);
    expect(result.columnNames).toEqual(['Name', 'Age']);
    expect(result.dataMatrix).toEqual([
      [{ value: '' }, { value: '' }],
      [{ value: 'Jack Black' }, { value: '54' }],
      [{ value: 'Kyle Gass' }, { value: '63.2' }],
    ]);
  });

  it('uses column{n} names when no header is detected', () => {
    const rows = [
      ['1', '2'],
      ['3', '4'],
    ];
    const result = sniffCsv(rows);

    expect(result.hasHeader).toBe(false);
    expect(result.columnNames).toEqual(['column0', 'column1']);
    expect(result.dataMatrix).toEqual([
      [{ value: '1' }, { value: '2' }],
      [{ value: '3' }, { value: '4' }],
    ]);
  });

  it('treats all-varchar columns as data when types match', () => {
    const rows = [
      ['foo', 'bar'],
      ['baz', 'qux'],
    ];
    const result = sniffCsv(rows);

    expect(result.hasHeader).toBe(false);
    expect(result.columnNames).toEqual(['column0', 'column1']);
    expect(result.dataMatrix[0]).toEqual([
      { value: 'foo' },
      { value: 'bar' },
    ]);
  });

  it('sniffs only the first 10 rows for header detection', () => {
    const rows = [
      ['id', 'value'],
      ...Array.from({ length: 20 }, (_, index) => [
        String(index),
        String(index * 2),
      ]),
    ];
    const result = sniffCsv(rows, 10);

    expect(result.hasHeader).toBe(true);
    expect(result.columnNames).toEqual(['id', 'value']);
    expect(result.dataMatrix).toHaveLength(20);
  });

  it('sniffs parsed csv matrix', () => {
    const matrix = parseCsv('Name,Height\nPedro,1.73\nMark,1.72');
    const result = sniffCsvMatrix(matrix);

    expect(result.hasHeader).toBe(true);
    expect(result.columnNames).toEqual(['Name', 'Height']);
    expect(result.dataMatrix).toEqual([
      [{ value: 'Pedro' }, { value: '1.73' }],
      [{ value: 'Mark' }, { value: '1.72' }],
    ]);
  });

  it('generates duckdb-style default column names', () => {
    expect(csvDuckdbColumnName(0)).toBe('column0');
    expect(csvDuckdbColumnName(3)).toBe('column3');
  });
});
