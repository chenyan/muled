import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
} from 'react';
import type { CsvQueryColumn } from '../../../shared/types/csvQuery';
import type { SqliteQueryResponse, SqliteSelectSuccess } from '../../../shared/types/sqliteQuery';
import {
  getDatabaseViewConfig,
  type DatabaseEngine,
} from '../../lib/databaseViewConfig';
import type { EditorTab } from '../../types/tab';
import CsvQueryResultGrid from './CsvQueryResultGrid';
import './SqliteDatabaseView.css';

const PAGE_SIZE = 100;
const MAX_ROWS = 10_000;

interface DatabaseViewProps {
  tab: EditorTab;
  engine: DatabaseEngine;
}

interface QueryCache {
  columns: CsvQueryColumn[];
  rows: Record<string, unknown>[];
  rowCount: number;
  truncated: boolean;
}

interface TableCache {
  columns: CsvQueryColumn[];
  rows: Record<string, unknown>[];
  totalCount: number;
  truncated: boolean;
}

function isSelectResult(response: SqliteQueryResponse): response is SqliteSelectSuccess {
  return response.ok && response.kind === 'select';
}

function RunIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden>
      <path fill="currentColor" d="M4 3.5v9l9-4.5-9-4.5z" />
    </svg>
  );
}

export default function DatabaseView({ tab, engine }: DatabaseViewProps) {
  const { client, defaultSql, quoteIdent } = useMemo(
    () => getDatabaseViewConfig(engine),
    [engine],
  );

  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [sql, setSql] = useState(defaultSql);
  const [openError, setOpenError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [changeMessage, setChangeMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [activeSource, setActiveSource] = useState<'table' | 'query'>('table');
  const [tableCache, setTableCache] = useState<TableCache | null>(null);
  const [tablePage, setTablePage] = useState(0);
  const [queryCache, setQueryCache] = useState<QueryCache | null>(null);
  const [queryPage, setQueryPage] = useState(0);
  const [autoPaginate, setAutoPaginate] = useState(true);

  const tableBrowseSql = useCallback(
    (tableName: string, page: number, paginate: boolean) => {
      const quoted = quoteIdent(tableName);
      if (!paginate) {
        return `SELECT * FROM ${quoted} LIMIT ${MAX_ROWS}`;
      }
      return `SELECT * FROM ${quoted} LIMIT ${PAGE_SIZE} OFFSET ${page * PAGE_SIZE}`;
    },
    [quoteIdent],
  );

  const tableCountSql = useCallback(
    (tableName: string) =>
      `SELECT COUNT(*) AS __count__ FROM ${quoteIdent(tableName)}`,
    [quoteIdent],
  );

  const openDatabase = useCallback(async () => {
    if (!tab.relativePath) {
      setOpenError('未指定数据库文件路径');
      return;
    }

    setOpenError(null);
    const response = await client.open({
      sessionId: tab.id,
      path: tab.relativePath,
    });

    if (!response.ok) {
      setOpenError(response.error);
      setTables([]);
      setSelectedTable(null);
      setTableCache(null);
      setQueryCache(null);
      return;
    }

    setTables(response.tables);
    setSelectedTable((current) => {
      if (current && response.tables.includes(current)) {
        return current;
      }
      return response.tables[0] ?? null;
    });
  }, [client, tab.id, tab.relativePath]);

  const loadTablePage = useCallback(
    async (
      tableName: string | null,
      page: number,
      paginate: boolean = autoPaginate,
    ) => {
      if (!tableName) {
        setTableCache(null);
        setStatusError(null);
        return;
      }

      setLoading(true);
      setStatusError(null);

      const countResponse = await client.query({
        sessionId: tab.id,
        sql: tableCountSql(tableName),
      });
      if (!countResponse.ok || !isSelectResult(countResponse)) {
        setLoading(false);
        setStatusError(
          countResponse.ok ? '无法读取表行数' : countResponse.error,
        );
        setTableCache(null);
        return;
      }

      const totalCount = Number(countResponse.rows[0]?.__count__ ?? 0);
      const dataResponse = await client.query({
        sessionId: tab.id,
        sql: tableBrowseSql(tableName, page, paginate),
      });

      setLoading(false);
      if (!dataResponse.ok || !isSelectResult(dataResponse)) {
        setStatusError(
          dataResponse.ok ? '无法读取表数据' : dataResponse.error,
        );
        setTableCache(null);
        return;
      }

      setTableCache({
        columns: dataResponse.columns,
        rows: dataResponse.rows,
        totalCount,
        truncated:
          dataResponse.truncated ||
          (!paginate && totalCount > dataResponse.rows.length),
      });
      setActiveSource('table');
    },
    [autoPaginate, client, tab.id, tableBrowseSql, tableCountSql],
  );

  const runQuery = useCallback(async () => {
    setLoading(true);
    setStatusError(null);
    setChangeMessage(null);

    const response = await client.query({
      sessionId: tab.id,
      sql,
    });

    setLoading(false);
    if (!response.ok) {
      setStatusError(response.error);
      return;
    }

    if (isSelectResult(response)) {
      setQueryCache({
        columns: response.columns,
        rows: response.rows,
        rowCount: response.rowCount,
        truncated: response.truncated,
      });
      setQueryPage(0);
      setActiveSource('query');
      return;
    }

    const rowidSuffix =
      response.lastInsertRowid != null
        ? `，last_insert_rowid = ${response.lastInsertRowid}`
        : '';
    setChangeMessage(`已执行，影响 ${response.changes} 行${rowidSuffix}`);

    const tablesResponse = await client.listTables(tab.id);
    if (tablesResponse.ok) {
      setTables(tablesResponse.tables);
      const nextTable =
        selectedTable && tablesResponse.tables.includes(selectedTable)
          ? selectedTable
          : (tablesResponse.tables[0] ?? null);
      setSelectedTable(nextTable);
      if (nextTable) {
        setTablePage(0);
        await loadTablePage(nextTable, 0);
      }
    }
  }, [client, loadTablePage, selectedTable, sql, tab.id]);

  useEffect(() => {
    setSql(defaultSql);
  }, [defaultSql, engine]);

  useEffect(() => {
    openDatabase().catch(() => undefined);
    return () => {
      client.close(tab.id).catch(() => undefined);
    };
  }, [client, openDatabase, tab.id]);

  useEffect(() => {
    loadTablePage(selectedTable, tablePage, autoPaginate).catch(() => undefined);
  }, [autoPaginate, loadTablePage, selectedTable, tablePage]);

  const handleAutoPaginateChange = useCallback((enabled: boolean) => {
    setAutoPaginate(enabled);
    setTablePage(0);
    setQueryPage(0);
  }, []);

  useEffect(() => {
    if (selectedTable) {
      setSql(`SELECT * FROM ${quoteIdent(selectedTable)}`);
    }
  }, [quoteIdent, selectedTable]);

  const handleSqlKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      runQuery().catch(() => undefined);
    }
  };

  const queryPageRows = useMemo(() => {
    if (!queryCache) return [];
    if (!autoPaginate) return queryCache.rows;
    const start = queryPage * PAGE_SIZE;
    return queryCache.rows.slice(start, start + PAGE_SIZE);
  }, [autoPaginate, queryCache, queryPage]);

  const gridProps = useMemo(() => {
    const paginationControls = {
      autoPaginate,
      onAutoPaginateChange: handleAutoPaginateChange,
    };

    if (activeSource === 'query' && queryCache) {
      return {
        columns: queryCache.columns,
        rows: queryPageRows,
        rowCount: queryCache.rowCount,
        truncated: queryCache.truncated,
        pagination: {
          ...paginationControls,
          page: queryPage,
          pageSize: PAGE_SIZE,
          totalCount: queryCache.rows.length,
          onPageChange: setQueryPage,
        },
      };
    }

    if (tableCache) {
      return {
        columns: tableCache.columns,
        rows: tableCache.rows,
        rowCount: autoPaginate ? tableCache.totalCount : tableCache.rows.length,
        truncated: tableCache.truncated,
        pagination: {
          ...paginationControls,
          page: tablePage,
          pageSize: PAGE_SIZE,
          totalCount: tableCache.totalCount,
          onPageChange: setTablePage,
        },
      };
    }

    return null;
  }, [
    activeSource,
    autoPaginate,
    handleAutoPaginateChange,
    queryCache,
    queryPage,
    queryPageRows,
    tableCache,
    tablePage,
  ]);

  return (
    <div className="SqliteDatabaseView">
      <div className="SqliteDatabaseView__toolbar">
        <label className="SqliteDatabaseView__field">
          <span>表</span>
          <select
            value={selectedTable ?? ''}
            disabled={tables.length === 0}
            onChange={(event) => {
              const next = event.target.value;
              setSelectedTable(next || null);
              setTablePage(0);
              setActiveSource('table');
            }}
          >
            {tables.length === 0 ? (
              <option value="">无表</option>
            ) : (
              tables.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))
            )}
          </select>
        </label>
        <button
          type="button"
          className="SqliteDatabaseView__refresh"
          disabled={loading || !selectedTable}
          onClick={() => {
            setTablePage(0);
            setActiveSource('table');
            loadTablePage(selectedTable, 0).catch(() => undefined);
          }}
        >
          刷新
        </button>
      </div>

      <div className="SqliteDatabaseView__sqlBar">
        <textarea
          className="SqliteDatabaseView__sql"
          value={sql}
          spellCheck={false}
          placeholder={defaultSql}
          onChange={(event) => setSql(event.target.value)}
          onKeyDown={handleSqlKeyDown}
        />
        <button
          type="button"
          className="SqliteDatabaseView__run"
          title="运行 (⌘↵)"
          aria-label="运行 SQL"
          aria-busy={loading}
          disabled={loading}
          onClick={() => {
            runQuery().catch(() => undefined);
          }}
        >
          <RunIcon />
        </button>
      </div>

      {openError ? (
        <p className="SqliteDatabaseView__error" role="alert">
          打开数据库失败：{openError}
        </p>
      ) : null}
      {statusError ? (
        <p className="SqliteDatabaseView__error" role="alert">
          {statusError}
        </p>
      ) : null}
      {changeMessage ? (
        <p className="SqliteDatabaseView__status">{changeMessage}</p>
      ) : null}

      <div className="SqliteDatabaseView__results">
        {gridProps ? (
          <CsvQueryResultGrid {...gridProps} />
        ) : !openError && !loading ? (
          <p className="SqliteDatabaseView__placeholder">
            {tables.length === 0 ? '数据库中没有用户表。' : '选择表以浏览数据。'}
          </p>
        ) : null}
      </div>
    </div>
  );
}
