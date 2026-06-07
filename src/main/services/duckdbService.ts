import fs from 'fs';
import os from 'os';
import path from 'path';
import { DuckDBConnection, DuckDBInstance } from '@duckdb/node-api';
import type {
  CsvQueryColumn,
  CsvQueryResponse,
  CsvRegisterResponse,
} from '../../shared/types/csvQuery';

const DEFAULT_TABLE = 'csv_data';
const MAX_ROWS = 10_000;

interface CsvSession {
  instance: DuckDBInstance;
  connection: DuckDBConnection;
  tempPath: string | null;
}

function escapeSqlString(value: string): string {
  return value.replace(/'/g, "''");
}

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

export default class DuckdbService {
  private readonly sessions = new Map<string, CsvSession>();

  async registerCsv(args: {
    sessionId: string;
    content: string;
  }): Promise<CsvRegisterResponse> {
    const { sessionId, content } = args;

    try {
      await this.closeSession(sessionId);
      const instance = await DuckDBInstance.create(':memory:');
      const connection = await instance.connect();

      const tempPath = path.join(
        os.tmpdir(),
        `muled-csv-${sessionId}.csv`,
      );
      fs.writeFileSync(tempPath, content, 'utf8');
      const csvPath = normalizePath(tempPath);

      const escapedPath = escapeSqlString(csvPath);
      await connection.run(
        `CREATE OR REPLACE TABLE ${DEFAULT_TABLE} AS SELECT * FROM read_csv_auto('${escapedPath}')`,
      );

      this.sessions.set(sessionId, { instance, connection, tempPath });
      return { ok: true, tableName: DEFAULT_TABLE };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async query(args: {
    sessionId: string;
    sql: string;
  }): Promise<CsvQueryResponse> {
    const { sessionId, sql } = args;
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { ok: false, error: 'CSV 数据尚未加载，请稍后重试' };
    }

    const trimmed = sql.trim();
    if (!trimmed) {
      return { ok: false, error: 'SQL 不能为空' };
    }

    try {
      const result = await session.connection.run(trimmed);
      const totalRows = result.rowCount;
      const rowObjects = await result.getRowObjectsJson();
      const truncated = totalRows > MAX_ROWS;
      const rows = truncated ? rowObjects.slice(0, MAX_ROWS) : rowObjects;

      const columns: CsvQueryColumn[] = result.columnNames().map((name, index) => ({
        name,
        type: String(result.columnTypeId(index)),
      }));

      return {
        ok: true,
        columns,
        rows: rows as Record<string, unknown>[],
        rowCount: totalRows,
        truncated,
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    try {
      session.connection.closeSync();
    } catch {
      /* ignore disconnect errors */
    }

    if (session.tempPath && fs.existsSync(session.tempPath)) {
      try {
        fs.unlinkSync(session.tempPath);
      } catch {
        /* ignore temp cleanup errors */
      }
    }

    this.sessions.delete(sessionId);
  }

  async closeAll(): Promise<void> {
    const ids = [...this.sessions.keys()];
    await Promise.all(ids.map((id) => this.closeSession(id)));
  }
}
