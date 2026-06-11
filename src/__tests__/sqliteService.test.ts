import fs from 'fs';
import os from 'os';
import path from 'path';
import SqliteService, {
  quoteSqliteIdent,
} from '../main/services/sqliteService';

describe('sqliteService', () => {
  let service: SqliteService;
  let dbPath: string;

  beforeEach(() => {
    service = new SqliteService();
    dbPath = path.join(
      os.tmpdir(),
      `muled-sqlite-test-${Date.now()}-${Math.random()}.sqlite3`,
    );
    fs.writeFileSync(dbPath, '');
  });

  afterEach(() => {
    service.closeAll();
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  });

  it('quotes sqlite identifiers', () => {
    expect(quoteSqliteIdent('users')).toBe('"users"');
    expect(quoteSqliteIdent('weird"name')).toBe('"weird""name"');
  });

  it('opens database and lists tables', () => {
    const opened = service.open({ sessionId: 'tab-1', absolutePath: dbPath });
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;

    const created = service.query({
      sessionId: 'tab-1',
      sql: 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)',
    });
    expect(created.ok).toBe(true);
    if (!created.ok || created.kind !== 'change') return;
    expect(created.changes).toBe(0);

    const tables = service.listTables('tab-1');
    expect(tables.ok).toBe(true);
    if (!tables.ok) return;
    expect(tables.tables).toEqual(['users']);
  });

  it('runs select and mutation queries', () => {
    service.open({ sessionId: 'tab-2', absolutePath: dbPath });
    service.query({
      sessionId: 'tab-2',
      sql: 'CREATE TABLE items (id INTEGER PRIMARY KEY, qty INTEGER)',
    });
    service.query({
      sessionId: 'tab-2',
      sql: 'INSERT INTO items (qty) VALUES (1), (2)',
    });

    const selected = service.query({
      sessionId: 'tab-2',
      sql: 'SELECT * FROM items ORDER BY id',
    });
    expect(selected.ok).toBe(true);
    if (!selected.ok || selected.kind !== 'select') return;
    expect(selected.rowCount).toBe(2);
    expect(selected.rows).toEqual([
      { id: 1, qty: 1 },
      { id: 2, qty: 2 },
    ]);

    const updated = service.query({
      sessionId: 'tab-2',
      sql: 'UPDATE items SET qty = 9 WHERE id = 1',
    });
    expect(updated.ok).toBe(true);
    if (!updated.ok || updated.kind !== 'change') return;
    expect(updated.changes).toBe(1);

    const deleted = service.query({
      sessionId: 'tab-2',
      sql: 'DROP TABLE items',
    });
    expect(deleted.ok).toBe(true);
    if (!deleted.ok || deleted.kind !== 'change') return;
    expect(deleted.changes).toBe(0);
  });
});
