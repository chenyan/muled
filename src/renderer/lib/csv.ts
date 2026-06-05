export type CsvCell = { value: string };
export type CsvMatrix = CsvCell[][];

export type CsvGridRow = {
  id: number;
  [columnKey: string]: string | number;
};

/** 将 CSV 文本解析为二维单元格矩阵 */
export function parseCsv(text: string): CsvMatrix {
  const rows = parseCsvRows(text);
  if (rows.length === 0) {
    return [[{ value: '' }]];
  }

  const maxCols = Math.max(...rows.map((row) => row.length), 1);
  return rows.map((row) =>
    Array.from({ length: maxCols }, (_, column) => ({
      value: row[column] ?? '',
    })),
  );
}

/** 将单元格矩阵序列化为 CSV 文本 */
export function serializeCsv(matrix: CsvMatrix): string {
  const rows = matrix.map((row) =>
    (row ?? []).map((cell) => formatCsvField(String(cell?.value ?? ''))),
  );

  while (
    rows.length > 0 &&
    rows[rows.length - 1].every((field) => field === '')
  ) {
    rows.pop();
  }

  if (rows.length === 0) {
    return '';
  }

  return rows.map((row) => row.join(',')).join('\n');
}

export function csvColumnKey(columnIndex: number): string {
  return `c${columnIndex}`;
}

export function getCsvColumnCount(matrix: CsvMatrix): number {
  if (matrix.length === 0) {
    return 1;
  }
  return Math.max(...matrix.map((row) => row?.length ?? 0), 1);
}

/** Excel 风格列标题：A, B, …, Z, AA, … */
export function csvColumnHeader(columnIndex: number): string {
  let remaining = columnIndex;
  let label = '';
  do {
    label = String.fromCharCode(65 + (remaining % 26)) + label;
    remaining = Math.floor(remaining / 26) - 1;
  } while (remaining >= 0);
  return label;
}

export function matrixToGridRows(matrix: CsvMatrix): CsvGridRow[] {
  const colCount = getCsvColumnCount(matrix);
  return matrix.map((row, id) => {
    const gridRow: CsvGridRow = { id };
    for (let column = 0; column < colCount; column += 1) {
      gridRow[csvColumnKey(column)] = String(row?.[column]?.value ?? '');
    }
    return gridRow;
  });
}

export function gridRowsToMatrix(
  rows: readonly CsvGridRow[],
  colCount: number,
): CsvMatrix {
  return rows.map((row) =>
    Array.from({ length: colCount }, (_, column) => ({
      value: String(row[csvColumnKey(column)] ?? ''),
    })),
  );
}

function formatCsvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  const pushField = () => {
    row.push(field);
    field = '';
  };

  const pushRow = () => {
    rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }

    if (char === ',') {
      pushField();
      i += 1;
      continue;
    }

    if (char === '\r') {
      pushField();
      pushRow();
      i += char === '\r' && text[i + 1] === '\n' ? 2 : 1;
      continue;
    }

    if (char === '\n') {
      pushField();
      pushRow();
      i += 1;
      continue;
    }

    field += char;
    i += 1;
  }

  if (inQuotes) {
    pushField();
    pushRow();
    return rows;
  }

  if (field.length > 0 || row.length > 0) {
    pushField();
    pushRow();
  }

  return rows;
}
