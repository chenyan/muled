import {
  cellValueToDisplayString,
  displayStringToCellValue,
  gridRowsToXlsxMatrix,
  xlsxMatrixToGridRows,
} from '../renderer/lib/xlsx';

describe('xlsx', () => {
  it('converts cell values to display strings', () => {
    expect(cellValueToDisplayString(null)).toBe('');
    expect(cellValueToDisplayString(42)).toBe('42');
    expect(cellValueToDisplayString(true)).toBe('true');
    expect(cellValueToDisplayString('hello')).toBe('hello');
    expect(
      cellValueToDisplayString(new Date('2024-01-02T03:04:05.000Z')),
    ).toBe('2024-01-02T03:04:05.000Z');
  });

  it('parses typed display strings back to cell values', () => {
    expect(displayStringToCellValue('')).toBe('');
    expect(displayStringToCellValue('42')).toBe(42);
    expect(displayStringToCellValue('3.14')).toBe(3.14);
    expect(displayStringToCellValue('true')).toBe(true);
    expect(displayStringToCellValue('false')).toBe(false);
    expect(displayStringToCellValue('hello')).toBe('hello');
  });

  it('converts between xlsx matrix and grid rows', () => {
    const matrix = [
      [
        { display: 'Name', native: 'Name' },
        { display: 'Amount', native: 'Amount' },
      ],
      [
        { display: 'Alice', native: 'Alice' },
        { display: '42', native: 42 },
      ],
    ];

    const rows = xlsxMatrixToGridRows(matrix);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.c0).toBe('Name');
    expect(rows[1]?.c1).toBe('42');

    rows[1] = { ...rows[1], c1: '99' };
    const edited = gridRowsToXlsxMatrix(rows, 2);
    expect(edited[1]?.[1]?.display).toBe('99');
    expect(edited[1]?.[1]?.native).toBeUndefined();
  });
});
