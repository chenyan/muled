import fs from 'fs';
import Database from 'better-sqlite3';
import type { CsvQueryColumn } from '../../shared/types/csvQuery';
import type {
  SqliteListTablesResponse,
  SqliteOpenResponse,
  SqliteQueryResponse,
} from '../../shared/types/sqliteQuery';

const MAX_ROWS = 10_000;

interface SqliteSession {
  db: Database.Database;
  absolutePath: string;
}

function quoteSqliteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

function listUserTables(db: Database.Database): string[] {
  const rows = db
    .prepare(
      `SELECT name FROM sqlite_master
       WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
       ORDER BY name`,
    )
    .all() as Array<{ name: string }>;
  return rows.map((row) => row.name);
}

function isSelectLikeSql(sql: string): boolean {
  return /^(SELECT|WITH|PRAGMA|EXPLAIN)\b/i.test(sql.trim());
}

function normalizeCellValue(value: unknown): unknown {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (Buffer.isBuffer(value)) {
    return value.toString('base64');
  }
  return value;
}

function normalizeRow(row: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    normalized[key] = normalizeCellValue(value);
  }
  return normalized;
}

export default class SqliteService {
  private readonly sessions = new Map<string, SqliteSession>();

  open(args: {
    sessionId: string;
    absolutePath: string;
  }): SqliteOpenResponse {
    const { sessionId, absolutePath } = args;

    try {
      this.closeSession(sessionId);

      if (!fs.existsSync(absolutePath)) {
        return { ok: false, error: `文件不存在: ${absolutePath}` };
      }

      const stat = fs.statSync(absolutePath);
      if (!stat.isFile()) {
        return { ok: false, error: '路径不是文件' };
      }

      const db = new Database(absolutePath);
      db.pragma('foreign_keys = ON');

      this.sessions.set(sessionId, { db, absolutePath });
      return {
        ok: true,
        tables: listUserTables(db),
        fileSize: stat.size,
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  listTables(sessionId: string): SqliteListTablesResponse {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { ok: false, error: '数据库尚未打开' };
    }

    try {
      return { ok: true, tables: listUserTables(session.db) };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  query(args: { sessionId: string; sql: string }): SqliteQueryResponse {
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
      if (isSelectLikeSql(trimmed)) {
        const stmt = session.db.prepare(trimmed);
        const allRows = stmt.all() as Record<string, unknown>[];
        const truncated = allRows.length > MAX_ROWS;
        const rows = (truncated ? allRows.slice(0, MAX_ROWS) : allRows).map(
          normalizeRow,
        );

        const columns: CsvQueryColumn[] = stmt.columns().map((column) => ({
          name: column.name,
          type: column.type ?? 'UNKNOWN',
        }));

        return {
          ok: true,
          kind: 'select',
          columns,
          rows,
          rowCount: allRows.length,
          truncated,
        };
      }

      const result = session.db.prepare(trimmed).run();
      return {
        ok: true,
        kind: 'change',
        changes: result.changes,
        lastInsertRowid:
          result.lastInsertRowid > 0 ? Number(result.lastInsertRowid) : null,
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  closeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    try {
      session.db.close();
    } catch {
      /* ignore close errors */
    }

    this.sessions.delete(sessionId);
  }

  closeAll(): void {
    for (const sessionId of [...this.sessions.keys()]) {
      this.closeSession(sessionId);
    }
  }
}

export { quoteSqliteIdent };
