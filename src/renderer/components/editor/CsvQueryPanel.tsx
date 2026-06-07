import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import type {
  CsvChartMode,
  CsvChartType2d,
  CsvQueryColumn,
  CsvQuerySuccess,
} from '../../../shared/types/csvQuery';
import type { EditorTab } from '../../types/tab';
import {
  buildPlotlyFigure,
  inferChartConfig,
  listDimensionColumns,
  listNumericColumns,
  type CsvChartConfig,
} from '../../lib/csvQueryPlotly';
import CsvQueryChart from './CsvQueryChart';
import CsvQueryResultGrid from './CsvQueryResultGrid';
import { useVerticalDragSize } from '../../hooks/useVerticalDragSize';
import './CsvQueryPanel.css';

const DEFAULT_SQL = 'SELECT * FROM csv_data LIMIT 100';
const SQL_EDITOR_MIN_HEIGHT = 72;
const SQL_EDITOR_MAX_HEIGHT = 320;
const SQL_EDITOR_DEFAULT_HEIGHT = 96;

interface CsvQueryPanelProps {
  tab: EditorTab;
  maximized: boolean;
  onMaximizedChange: (maximized: boolean) => void;
  onExpandedChange?: (expanded: boolean) => void;
}

function RunIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden>
      <path fill="currentColor" d="M4 3.5v9l9-4.5-9-4.5z" />
    </svg>
  );
}

function MaximizeIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        d="M3.5 3.5h4v4h-4v-4zm5 0h4v4h-4v-4zm-5 5h4v4h-4v-4zm5 0h4v4h-4v-4z"
      />
    </svg>
  );
}

function RestoreIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        d="M3.5 6.5V3.5h8v8h-3M6.5 6.5h5v5h-5v-5z"
      />
    </svg>
  );
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export default function CsvQueryPanel({
  tab,
  maximized,
  onMaximizedChange,
  onExpandedChange,
}: CsvQueryPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [sql, setSql] = useState(DEFAULT_SQL);
  const [sqlEditorHeight, setSqlEditorHeight] = useState(
    SQL_EDITOR_DEFAULT_HEIGHT,
  );
  const [loading, setLoading] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [result, setResult] = useState<CsvQuerySuccess | null>(null);
  const [resultTab, setResultTab] = useState<'table' | 'chart'>('table');
  const [chartConfig, setChartConfig] = useState<CsvChartConfig>(() =>
    inferChartConfig([], []),
  );

  const debouncedContent = useDebouncedValue(tab.content, 400);
  const registerVersionRef = useRef(0);
  const sqlEditorRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [lockedResultsHeight, setLockedResultsHeight] = useState<number | null>(
    null,
  );

  const handleSqlResizeStart = useCallback(() => {
    const resultsEl = resultsRef.current;
    if (!resultsEl) return;
    setLockedResultsHeight(
      Math.round(resultsEl.getBoundingClientRect().height),
    );
  }, []);

  const handleSqlResizeEnd = useCallback(() => {
    setLockedResultsHeight(null);
  }, []);

  const { dragging: resizingSql, handleProps: sqlResizeHandleProps } =
    useVerticalDragSize({
      value: sqlEditorHeight,
      min: SQL_EDITOR_MIN_HEIGHT,
      max: SQL_EDITOR_MAX_HEIGHT,
      onChange: setSqlEditorHeight,
      liveTargetRef: sqlEditorRef,
      ariaLabel: '调整 SQL 输入框高度',
      onDragStart: handleSqlResizeStart,
      onDragEnd: handleSqlResizeEnd,
    });

  const registerCsv = useCallback(async () => {
    const version = registerVersionRef.current + 1;
    registerVersionRef.current = version;
    setRegisterError(null);

    const response = await window.muled.csv.register({
      sessionId: tab.id,
      content: tab.content,
    });

    if (registerVersionRef.current !== version) return false;
    if (!response.ok) {
      setRegisterError(response.error);
      return false;
    }
    return true;
  }, [tab.content, tab.id]);

  const runQuery = useCallback(async () => {
    setLoading(true);
    setQueryError(null);

    const registered = await registerCsv();
    if (!registered) {
      setLoading(false);
      return;
    }

    const response = await window.muled.csv.query({
      sessionId: tab.id,
      sql,
    });

    setLoading(false);
    if (!response.ok) {
      setQueryError(response.error);
      setResult(null);
      return;
    }

    setResult(response);
    setChartConfig(inferChartConfig(response.columns, response.rows));
    setResultTab('table');
  }, [registerCsv, sql, tab.id]);

  useEffect(() => {
    if (!expanded) return undefined;

    let cancelled = false;
    const sync = async () => {
      const ok = await registerCsv();
      if (!cancelled && !ok) {
        setResult(null);
      }
    };
    sync();

    return () => {
      cancelled = true;
    };
  }, [debouncedContent, expanded, registerCsv]);

  useEffect(
    () => () => {
      window.muled.csv.close(tab.id).catch(() => undefined);
    },
    [tab.id],
  );

  const dimensionColumns = useMemo(
    () =>
      result
        ? listDimensionColumns(result.rows, result.columns)
        : ([] as string[]),
    [result],
  );

  const numericColumns = useMemo(
    () =>
      result ? listNumericColumns(result.rows, result.columns) : ([] as string[]),
    [result],
  );

  const figure = useMemo(
    () => (result ? buildPlotlyFigure(result.rows, chartConfig) : null),
    [chartConfig, result],
  );

  const handleSqlKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      runQuery().catch(() => undefined);
    }
  };

  const updateChartConfig = (patch: Partial<CsvChartConfig>) => {
    setChartConfig((prev) => ({ ...prev, ...patch }));
  };

  const toggleMeasure = (column: string) => {
    setChartConfig((prev) => {
      const selected = new Set(prev.measures);
      if (selected.has(column)) {
        selected.delete(column);
      } else {
        selected.add(column);
      }
      return { ...prev, measures: [...selected] };
    });
  };

  const handleToggleExpanded = () => {
    setExpanded((value) => {
      const next = !value;
      if (value && maximized) {
        onMaximizedChange(false);
      }
      onExpandedChange?.(next);
      return next;
    });
  };

  const handleToggleMaximized = () => {
    if (!expanded) {
      setExpanded(true);
      onExpandedChange?.(true);
    }
    onMaximizedChange(!maximized);
  };

  return (
    <section
      className={`CsvQueryPanel${expanded ? ' CsvQueryPanel--expanded' : ''}${maximized ? ' CsvQueryPanel--maximized' : ''}${resizingSql ? ' CsvQueryPanel--resizingSql' : ''}`}
      aria-label="CSV SQL 查询"
    >
      <div className="CsvQueryPanel__header">
        <button
          type="button"
          className="CsvQueryPanel__toggle"
          aria-expanded={expanded}
          onClick={handleToggleExpanded}
        >
          <span
            className={`CsvQueryPanel__chevron${expanded ? ' CsvQueryPanel__chevron--expanded' : ''}`}
            aria-hidden="true"
          />
          <span className="CsvQueryPanel__title">SQL 查询</span>
        </button>
        <span className="CsvQueryPanel__hint">DuckDB · Plotly</span>
        {expanded ? (
          <div className="CsvQueryPanel__headerActions" role="group" aria-label="SQL 操作">
            <button
              type="button"
              className="CsvQueryPanel__iconBtn CsvQueryPanel__iconBtn--run"
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
            <button
              type="button"
              className="CsvQueryPanel__iconBtn"
              title={maximized ? '还原编辑区' : '最大化查询面板'}
              aria-label={maximized ? '还原编辑区' : '最大化查询面板'}
              aria-pressed={maximized}
              onClick={handleToggleMaximized}
            >
              {maximized ? <RestoreIcon /> : <MaximizeIcon />}
            </button>
          </div>
        ) : null}
      </div>

      {expanded ? (
        <div className="CsvQueryPanel__body">
          <div className="CsvQueryPanel__sqlSection">
            <div
              ref={sqlEditorRef}
              className="CsvQueryPanel__sqlEditor"
              style={{ height: sqlEditorHeight }}
            >
              <textarea
                className="CsvQueryPanel__sql"
                value={sql}
                spellCheck={false}
                placeholder={DEFAULT_SQL}
                onChange={(event) => setSql(event.target.value)}
                onKeyDown={handleSqlKeyDown}
              />
            </div>
            <div
              className={`CsvQueryPanel__sqlResize${resizingSql ? ' CsvQueryPanel__sqlResize--active' : ''}`}
              {...sqlResizeHandleProps}
            />
          </div>

          {registerError ? (
            <p className="CsvQueryPanel__error" role="alert">
              加载 CSV 失败：{registerError}
            </p>
          ) : null}
          {queryError ? (
            <p className="CsvQueryPanel__error" role="alert">
              {queryError}
            </p>
          ) : null}

          {result ? (
            <div
              ref={resultsRef}
              className="CsvQueryPanel__results"
              style={
                lockedResultsHeight != null
                  ? {
                      flex: 'none',
                      height: lockedResultsHeight,
                      overflow: 'hidden',
                    }
                  : undefined
              }
            >
              <div className="CsvQueryPanel__resultTabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={resultTab === 'table'}
                  className={`CsvQueryPanel__resultTab${resultTab === 'table' ? ' CsvQueryPanel__resultTab--active' : ''}`}
                  onClick={() => setResultTab('table')}
                >
                  表格
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={resultTab === 'chart'}
                  className={`CsvQueryPanel__resultTab${resultTab === 'chart' ? ' CsvQueryPanel__resultTab--active' : ''}`}
                  onClick={() => setResultTab('chart')}
                >
                  图表
                </button>
              </div>

              {!resizingSql && resultTab === 'table' ? (
                <CsvQueryResultGrid
                  columns={result.columns}
                  rows={result.rows}
                  rowCount={result.rowCount}
                  truncated={result.truncated}
                />
              ) : null}
              {!resizingSql && resultTab === 'chart' ? (
                <div className="CsvQueryPanel__chartPane">
                  <ChartControls
                    columns={result.columns}
                    dimensionColumns={dimensionColumns}
                    numericColumns={numericColumns}
                    config={chartConfig}
                    onChange={updateChartConfig}
                    onToggleMeasure={toggleMeasure}
                  />
                  <CsvQueryChart figure={figure} />
                </div>
              ) : null}
              {resizingSql ? (
                <div className="CsvQueryPanel__resultsPlaceholder" aria-hidden />
              ) : null}
            </div>
          ) : (
            <p className="CsvQueryPanel__placeholder">
              运行 SQL 查看结果。默认表名：<code>csv_data</code>
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}

interface ChartControlsProps {
  columns: CsvQueryColumn[];
  dimensionColumns: string[];
  numericColumns: string[];
  config: CsvChartConfig;
  onChange: (patch: Partial<CsvChartConfig>) => void;
  onToggleMeasure: (column: string) => void;
}

function ChartControls({
  columns,
  dimensionColumns,
  numericColumns,
  config,
  onChange,
  onToggleMeasure,
}: ChartControlsProps) {
  const columnNames = columns.map((column) => column.name);
  const xOptions =
    dimensionColumns.length > 0 ? dimensionColumns : columnNames;
  const yOptions =
    dimensionColumns.length > 0 ? dimensionColumns : columnNames;

  return (
    <div className="CsvQueryPanel__chartControls">
      <label className="CsvQueryPanel__field">
        <span>模式</span>
        <select
          value={config.mode}
          onChange={(event) =>
            onChange({ mode: event.target.value as CsvChartMode })
          }
        >
          <option value="2d">2D（1 维度）</option>
          <option value="3d">3D（2 维度）</option>
        </select>
      </label>

      {config.mode === '2d' ? (
        <label className="CsvQueryPanel__field">
          <span>类型</span>
          <select
            value={config.chartType2d}
            onChange={(event) =>
              onChange({
                chartType2d: event.target.value as CsvChartType2d,
              })
            }
          >
            <option value="line">折线</option>
            <option value="bar">柱状</option>
            <option value="scatter">散点</option>
          </select>
        </label>
      ) : null}

      <label className="CsvQueryPanel__field">
        <span>X</span>
        <select
          value={config.xColumn}
          onChange={(event) => onChange({ xColumn: event.target.value })}
        >
          {xOptions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>

      {config.mode === '3d' ? (
        <label className="CsvQueryPanel__field">
          <span>Y</span>
          <select
            value={config.yColumn}
            onChange={(event) => onChange({ yColumn: event.target.value })}
          >
            {yOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="CsvQueryPanel__measures">
        <span className="CsvQueryPanel__measuresLabel">
          {config.mode === '3d' ? 'Z 度量' : '度量（可多选）'}
        </span>
        <div className="CsvQueryPanel__measureList">
          {numericColumns.length === 0 ? (
            <span className="CsvQueryPanel__measureEmpty">无可用数值列</span>
          ) : (
            numericColumns.map((name) => (
              <label key={name} className="CsvQueryPanel__measureItem">
                <input
                  type="checkbox"
                  checked={config.measures.includes(name)}
                  onChange={() => onToggleMeasure(name)}
                />
                <span>{name}</span>
              </label>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
