import type { CellValue, Worksheet } from 'exceljs';
import {
  csvColumnHeader,
  csvColumnKey,
  getCsvColumnCount,
  gridRowsToMatrix,
  matrixToGridRows,
  type CsvGridRow,
  type CsvMatrix,
} from './csv';

export type XlsxMatrixCell = {
  display: string;
  /** 未编辑单元格保留原始 Excel 值类型 */
  native?: CellValue;
};

export type XlsxMatrix = XlsxMatrixCell[][];

export type XlsxSheetData = {
  name: string;
  matrix: XlsxMatrix;
};

export type XlsxWorkbookData = {
  sheets: XlsxSheetData[];
  activeSheetIndex: number;
};

export function cellValueToDisplayString(value: CellValue): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object') {
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text ?? '').join('');
    }
    if ('text' in value && typeof value.text === 'string') {
      return value.text;
    }
    if ('result' in value && value.result != null) {
      return cellValueToDisplayString(value.result as CellValue);
    }
    if ('formula' in value && typeof value.formula === 'string') {
      return value.formula;
    }
    if ('error' in value) {
      return String(value.error ?? '');
    }
  }
  return String(value);
}

export function displayStringToCellValue(text: string): CellValue {
  const trimmed = text.trim();
  if (trimmed === '') return '';
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }
  return text;
}

function resolveWorksheetSize(worksheet: Worksheet): {
  rowCount: number;
  colCount: number;
} {
  let rowCount = worksheet.rowCount;
  let colCount = worksheet.columnCount;

  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    rowCount = Math.max(rowCount, rowNumber);
    row.eachCell({ includeEmpty: false }, (_cell, colNumber) => {
      colCount = Math.max(colCount, colNumber);
    });
  });

  return {
    rowCount: Math.max(rowCount, 1),
    colCount: Math.max(colCount, 1),
  };
}

function worksheetToMatrix(worksheet: Worksheet): XlsxMatrix {
  const { rowCount, colCount } = resolveWorksheetSize(worksheet);
  const matrix: XlsxMatrix = [];

  for (let rowIndex = 1; rowIndex <= rowCount; rowIndex += 1) {
    const row: XlsxMatrixCell[] = [];
    for (let colIndex = 1; colIndex <= colCount; colIndex += 1) {
      const cell = worksheet.getCell(rowIndex, colIndex);
      row.push({
        display: cellValueToDisplayString(cell.value),
        native: cell.value ?? undefined,
      });
    }
    matrix.push(row);
  }

  return matrix;
}

export async function parseXlsxBuffer(
  buffer: ArrayBuffer,
): Promise<XlsxWorkbookData> {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheets = workbook.worksheets.map((worksheet) => ({
    name: worksheet.name,
    matrix: worksheetToMatrix(worksheet),
  }));

  if (sheets.length === 0) {
    return {
      sheets: [{ name: 'Sheet1', matrix: [[{ display: '' }]] }],
      activeSheetIndex: 0,
    };
  }

  return { sheets, activeSheetIndex: 0 };
}

export async function serializeXlsxWorkbook(
  data: XlsxWorkbookData,
): Promise<ArrayBuffer> {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();

  data.sheets.forEach((sheet) => {
    const worksheet = workbook.addWorksheet(sheet.name || 'Sheet1');
    sheet.matrix.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        const value =
          cell.native !== undefined
            ? cell.native
            : displayStringToCellValue(cell.display);
        worksheet.getCell(rowIndex + 1, colIndex + 1).value = value;
      });
    });
  });

  const out = await workbook.xlsx.writeBuffer();
  return out as ArrayBuffer;
}

export function xlsxMatrixToDisplayMatrix(matrix: XlsxMatrix): CsvMatrix {
  return matrix.map((row) =>
    row.map((cell) => ({ value: cell.display })),
  );
}

export function xlsxMatrixToGridRows(matrix: XlsxMatrix): CsvGridRow[] {
  return matrixToGridRows(xlsxMatrixToDisplayMatrix(matrix));
}

export function gridRowsToXlsxMatrix(
  rows: readonly CsvGridRow[],
  colCount: number,
): XlsxMatrix {
  const displayMatrix = gridRowsToMatrix(rows, colCount);
  return displayMatrix.map((row) =>
    row.map((cell) => ({
      display: cell.value,
    })),
  );
}

export function getXlsxColumnCount(matrix: XlsxMatrix): number {
  return getCsvColumnCount(xlsxMatrixToDisplayMatrix(matrix));
}

export function buildXlsxColumnNames(colCount: number): string[] {
  return Array.from({ length: colCount }, (_, index) => csvColumnHeader(index));
}

export { csvColumnKey };
