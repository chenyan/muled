import fs from 'fs';
import os from 'os';
import path from 'path';
import DuckdbFileService from '../main/services/duckdbFileService';

describe('duckdbFileService', () => {
  let service: DuckdbFileService;
  let dbPath: string;

  beforeEach(() => {
    service = new DuckdbFileService();
    dbPath = path.join(
      os.tmpdir(),
      `muled-duckdb-test-${Date.now()}-${Math.random()}.duckdb`,
    );
  });

  afterEach(async () => {
    await service.closeAll();
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  });

  it('opens database and lists tables', async () => {
    const opened = await service.open({ sessionId: 'tab-1', absolutePath: dbPath });
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;

    const created = await service.query({
      sessionId: 'tab-1',
      sql: 'CREATE TABLE users (id INTEGER, name VARCHAR)',
    });
    expect(created.ok).toBe(true);
    if (!created.ok || created.kind !== 'change') return;
    expect(created.changes).toBe(0);

    const tables = await service.listTables('tab-1');
    expect(tables.ok).toBe(true);
    if (!tables.ok) return;
    expect(tables.tables).toEqual(['users']);
  });

  it('runs select and mutation queries', async () => {
    await service.open({ sessionId: 'tab-2', absolutePath: dbPath });
    await service.query({
      sessionId: 'tab-2',
      sql: 'CREATE TABLE items (id INTEGER, qty INTEGER)',
    });
    await service.query({
      sessionId: 'tab-2',
      sql: 'INSERT INTO items VALUES (1, 1), (2, 2)',
    });

    const selected = await service.query({
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

    const updated = await service.query({
      sessionId: 'tab-2',
      sql: 'UPDATE items SET qty = 9 WHERE id = 1',
    });
    expect(updated.ok).toBe(true);
    if (!updated.ok || updated.kind !== 'change') return;
    expect(updated.changes).toBe(1);
  });
});
