import { getCsvColumnCount, type CsvMatrix } from './csv';

const SAMPLE_SIZE = 10;

const TYPE_ORDER = [
  'SQLNULL',
  'BOOLEAN',
  'BIGINT',
  'DOUBLE',
  'TIME',
  'DATE',
  'TIMESTAMP',
  'VARCHAR',
] as const;

type CsvValueType = (typeof TYPE_ORDER)[number];

const DATE_PATTERNS = [
  /^\d{1,2}-\d{1,2}-\d{4}$/,
  /^\d{1,2}-\d{1,2}-\d{2}$/,
  /^\d{4}-\d{1,2}-\d{1,2}$/,
  /^\d{2}-\d{1,2}-\d{1,2}$/,
];

const TIME_PATTERNS = [
  /^\d{1,2}:\d{2}(:\d{2})?$/,
  /^\d{1,2}:\d{2}(:\d{2})?\.\d+$/,
];

const TIMESTAMP_PATTERNS = [
  /^\d{4}-\d{1,2}-\d{1,2}[T ]\d{1,2}:\d{2}:\d{2}(\.\d+)?$/,
  /^\d{2}-\d{1,2}-\d{1,2}[T ]\d{1,2}:\d{2}:\d{2}(\.\d+)?$/,
  /^\d{1,2}-\d{1,2}-\d{4} \d{1,2}:\d{2}:\d{2}( [AP]M)?$/i,
  /^\d{1,2}-\d{1,2}-\d{2} \d{1,2}:\d{2}:\d{2}( [AP]M)?$/i,
];

export type CsvSniffResult = {
  hasHeader: boolean;
  columnNames: string[];
  dataMatrix: CsvMatrix;
};

/** DuckDB 默认列名：column0, column1, … */
export function csvDuckdbColumnName(columnIndex: number): string {
  return `column${columnIndex}`;
}

function allTypeCandidates(): CsvValueType[] {
  return [...TYPE_ORDER];
}

function tryCast(value: string, type: CsvValueType): boolean {
  const trimmed = value.trim();

  switch (type) {
    case 'SQLNULL':
      return (
        trimmed === '' ||
        trimmed.toLowerCase() === 'null' ||
        trimmed.toLowerCase() === 'n/a'
      );
    case 'BOOLEAN':
      return /^(true|false|t|f|yes|no|0|1)$/i.test(trimmed);
    case 'BIGINT':
      return /^-?\d+$/.test(trimmed);
    case 'DOUBLE':
      return /^-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(trimmed);
    case 'TIME':
      return TIME_PATTERNS.some((pattern) => pattern.test(trimmed));
    case 'DATE':
      return DATE_PATTERNS.some((pattern) => pattern.test(trimmed));
    case 'TIMESTAMP':
      return TIMESTAMP_PATTERNS.some((pattern) => pattern.test(trimmed));
    case 'VARCHAR':
      return true;
    default:
      return false;
  }
}

function isSqlNullValue(value: string): boolean {
  return tryCast(value, 'SQLNULL');
}

function detectColumnTypes(
  rows: readonly string[][],
  colCount: number,
): CsvValueType[][] {
  const candidates = Array.from({ length: colCount }, () => allTypeCandidates());

  for (const row of rows) {
    for (let column = 0; column < colCount; column += 1) {
      const value = row[column] ?? '';
      if (isSqlNullValue(value)) {
        continue;
      }

      candidates[column] = candidates[column].filter((type) =>
        tryCast(value, type),
      );
      if (candidates[column].length === 0) {
        candidates[column] = ['VARCHAR'];
      }
    }
  }

  return candidates;
}

function mostSpecificType(candidates: readonly CsvValueType[]): CsvValueType {
  for (const type of TYPE_ORDER) {
    if (candidates.includes(type)) {
      return type;
    }
  }
  return 'VARCHAR';
}

function detectHeader(
  firstRow: readonly string[],
  dataRows: readonly string[][],
  colCount: number,
): boolean {
  if (dataRows.length === 0) {
    return false;
  }

  const columnTypes = detectColumnTypes(dataRows, colCount);

  for (let column = 0; column < colCount; column += 1) {
    const value = firstRow[column] ?? '';
    const targetType = mostSpecificType(columnTypes[column]);
    if (!tryCast(value, targetType)) {
      return true;
    }
  }

  return false;
}

function rowsToMatrix(rows: readonly string[][]): CsvMatrix {
  if (rows.length === 0) {
    return [[{ value: '' }]];
  }

  const colCount = Math.max(...rows.map((row) => row.length), 1);
  return rows.map((row) =>
    Array.from({ length: colCount }, (_, column) => ({
      value: row[column] ?? '',
    })),
  );
}

function buildColumnNames(
  hasHeader: boolean,
  firstRow: readonly string[],
  colCount: number,
): string[] {
  if (hasHeader) {
    return Array.from({ length: colCount }, (_, column) => {
      const name = (firstRow[column] ?? '').trim();
      return name || csvDuckdbColumnName(column);
    });
  }

  return Array.from({ length: colCount }, (_, column) =>
    csvDuckdbColumnName(column),
  );
}

/**
 * 参考 DuckDB CSV Sniffer 的 Header Detection：
 * 用前 sampleSize 行做类型推断，若首行无法按数据列类型转换则视为表头。
 * @see https://duckdb.org/2023/10/27/csv-sniffer
 */
export function sniffCsv(
  rows: readonly string[][],
  sampleSize = SAMPLE_SIZE,
): CsvSniffResult {
  if (rows.length === 0) {
    return {
      hasHeader: false,
      columnNames: [csvDuckdbColumnName(0)],
      dataMatrix: [[{ value: '' }]],
    };
  }

  const sample = rows.slice(0, sampleSize);
  const colCount = Math.max(...sample.map((row) => row.length), 1);
  const firstRow = Array.from(
    { length: colCount },
    (_, column) => sample[0]?.[column] ?? '',
  );
  const sampleDataRows = sample.slice(1).map((row) =>
    Array.from({ length: colCount }, (_, column) => row[column] ?? ''),
  );

  const hasHeader = detectHeader(firstRow, sampleDataRows, colCount);
  const columnNames = buildColumnNames(hasHeader, firstRow, colCount);
  const dataRows = hasHeader ? rows.slice(1) : rows;

  return {
    hasHeader,
    columnNames,
    dataMatrix: rowsToMatrix(dataRows),
  };
}

export function sniffCsvMatrix(
  matrix: CsvMatrix,
  sampleSize = SAMPLE_SIZE,
): CsvSniffResult {
  const rows = matrix.map((row) => row.map((cell) => String(cell?.value ?? '')));
  const sniffed = sniffCsv(rows, sampleSize);
  const colCount = getCsvColumnCount(sniffed.dataMatrix);

  return {
    ...sniffed,
    columnNames: sniffed.columnNames.slice(0, colCount),
  };
}
