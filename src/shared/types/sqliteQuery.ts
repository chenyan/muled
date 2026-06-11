import type { CsvQueryColumn } from './csvQuery';

export interface SqliteOpenSuccess {
  ok: true;
  tables: string[];
  fileSize: number;
}

export interface SqliteOpenFailure {
  ok: false;
  error: string;
}

export type SqliteOpenResponse = SqliteOpenSuccess | SqliteOpenFailure;

export interface SqliteSelectSuccess {
  ok: true;
  kind: 'select';
  columns: CsvQueryColumn[];
  rows: Record<string, unknown>[];
  rowCount: number;
  truncated: boolean;
}

export interface SqliteChangeSuccess {
  ok: true;
  kind: 'change';
  changes: number;
  lastInsertRowid: number | null;
}

export interface SqliteQueryFailure {
  ok: false;
  error: string;
}

export type SqliteQueryResponse =
  | SqliteSelectSuccess
  | SqliteChangeSuccess
  | SqliteQueryFailure;

export interface SqliteListTablesSuccess {
  ok: true;
  tables: string[];
}

export interface SqliteListTablesFailure {
  ok: false;
  error: string;
}

export type SqliteListTablesResponse =
  | SqliteListTablesSuccess
  | SqliteListTablesFailure;
