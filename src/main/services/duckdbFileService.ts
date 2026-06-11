import fs from 'fs';
import { DuckDBConnection, DuckDBInstance } from '@duckdb/node-api';
import type { CsvQueryColumn } from '../../shared/types/csvQuery';
import type {
  SqliteListTablesResponse,
  SqliteOpenResponse,
  SqliteQueryResponse,
} from '../../shared/types/sqliteQuery';

const MAX_ROWS = 10_000;

interface DuckdbFileSession {
  instance: DuckDBInstance;
  connection: DuckDBConnection;
  absolutePath: string;
}

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

function isSelectLikeSql(sql: string): boolean {
  return /^(SELECT|WITH|PRAGMA|EXPLAIN|DESCRIBE|SHOW)\b/i.test(sql.trim());
}

async function listUserTables(
  connection: DuckDBConnection,
): Promise<string[]> {
  const result = await connection.run(
    `SELECT table_name AS name
     FROM information_schema.tables
     WHERE table_schema = 'main' AND table_type = 'BASE TABLE'
     ORDER BY table_name`,
  );
  const rows = await result.getRowObjectsJson();
  return rows.map((row) => String(row.name));
}

export default class DuckdbFileService {
  private readonly sessions = new Map<string, DuckdbFileSession>();

  async open(args: {
    sessionId: string;
    absolutePath: string;
  }): Promise<SqliteOpenResponse> {
    const { sessionId, absolutePath } = args;

    try {
      await this.closeSession(sessionId);

      if (fs.existsSync(absolutePath)) {
        const stat = fs.statSync(absolutePath);
        if (!stat.isFile()) {
          return { ok: false, error: '路径不是文件' };
        }
      }

      const instance = await DuckDBInstance.create(absolutePath);
      const connection = await instance.connect();
      const tables = await listUserTables(connection);
      const fileSize = fs.existsSync(absolutePath)
        ? fs.statSync(absolutePath).size
        : 0;

      this.sessions.set(sessionId, { instance, connection, absolutePath });
      return {
        ok: true,
        tables,
        fileSize,
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async listTables(sessionId: string): Promise<SqliteListTablesResponse> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { ok: false, error: '数据库尚未打开' };
    }

    try {
      return { ok: true, tables: await listUserTables(session.connection) };
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
  }): Promise<SqliteQueryResponse> {
    const { sessionId, sql } = args;
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { ok: false, error: '数据库尚未打开' };
    }

    const trimmed = sql.trim();
    if (!trimmed) {
      return { ok: false, error: 'SQL 不能为空' };
    }

    try {
      const result = await session.connection.run(trimmed);

      if (isSelectLikeSql(trimmed)) {
        const totalRows = result.rowCount;
        const rowObjects = await result.getRowObjectsJson();
        const truncated = totalRows > MAX_ROWS;
        const rows = (
          truncated ? rowObjects.slice(0, MAX_ROWS) : rowObjects
        ) as Record<string, unknown>[];

        const columns: CsvQueryColumn[] = result
          .columnNames()
          .map((name, index) => ({
            name,
            type: String(result.columnTypeId(index)),
          }));

        return {
          ok: true,
          kind: 'select',
          columns,
          rows,
          rowCount: totalRows,
          truncated,
        };
      }

      return {
        ok: true,
        kind: 'change',
        changes: result.rowsChanged,
        lastInsertRowid: null,
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

    try {
      session.instance.closeSync();
    } catch {
      /* ignore close errors */
    }

    this.sessions.delete(sessionId);
  }

  async closeAll(): Promise<void> {
    const ids = [...this.sessions.keys()];
    await Promise.all(ids.map((id) => this.closeSession(id)));
  }
}

export { quoteIdent as quoteDuckdbIdent };
