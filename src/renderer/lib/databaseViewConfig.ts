import type {
  SqliteListTablesResponse,
  SqliteOpenResponse,
  SqliteQueryResponse,
} from '../../shared/types/sqliteQuery';
import { quoteSqliteIdent } from './sqliteIdent';

export type DatabaseEngine = 'sqlite' | 'duckdb';

export interface DatabaseClient {
  open: (args: {
    sessionId: string;
    path: string;
  }) => Promise<SqliteOpenResponse>;
  query: (args: {
    sessionId: string;
    sql: string;
  }) => Promise<SqliteQueryResponse>;
  listTables: (sessionId: string) => Promise<SqliteListTablesResponse>;
  close: (sessionId: string) => Promise<{ ok: boolean }>;
}

export interface DatabaseViewConfig {
  engine: DatabaseEngine;
  defaultSql: string;
  quoteIdent: (name: string) => string;
  client: DatabaseClient;
}

const DUCKDB_DEFAULT_SQL =
  "SELECT table_name FROM information_schema.tables WHERE table_schema = 'main' AND table_type = 'BASE TABLE' ORDER BY table_name";

const SQLITE_DEFAULT_SQL =
  "SELECT name FROM sqlite_master WHERE type = 'table'";

export function getDatabaseViewConfig(
  engine: DatabaseEngine,
): DatabaseViewConfig {
  if (engine === 'duckdb') {
    return {
      engine,
      defaultSql: DUCKDB_DEFAULT_SQL,
      quoteIdent: quoteSqliteIdent,
      client: window.muled.duckdbFile,
    };
  }

  return {
    engine,
    defaultSql: SQLITE_DEFAULT_SQL,
    quoteIdent: quoteSqliteIdent,
    client: window.muled.sqlite,
  };
}
