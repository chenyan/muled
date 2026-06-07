export interface CsvQueryColumn {
  name: string;
  type: string;
}

export interface CsvQuerySuccess {
  ok: true;
  columns: CsvQueryColumn[];
  rows: Record<string, unknown>[];
  rowCount: number;
  truncated: boolean;
}

export interface CsvQueryFailure {
  ok: false;
  error: string;
}

export type CsvQueryResponse = CsvQuerySuccess | CsvQueryFailure;

export interface CsvRegisterSuccess {
  ok: true;
  tableName: string;
}

export interface CsvRegisterFailure {
  ok: false;
  error: string;
}

export type CsvRegisterResponse = CsvRegisterSuccess | CsvRegisterFailure;

export type CsvChartMode = '2d' | '3d';

export type CsvChartType2d = 'line' | 'bar' | 'scatter';
