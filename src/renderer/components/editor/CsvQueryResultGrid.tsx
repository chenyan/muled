import { useMemo } from 'react';
import { DataGrid, type Column } from 'react-data-grid';
import 'react-data-grid/lib/styles.css';
import { useAppTheme } from '../../hooks/useAppTheme';
import type { CsvQueryColumn } from '../../shared/types/csvQuery';
import './CsvQueryResultGrid.css';

type ResultRow = Record<string, unknown> & { id: number };

export interface CsvQueryResultPagination {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  autoPaginate: boolean;
  onAutoPaginateChange: (enabled: boolean) => void;
}

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 4L6 8l4 4"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 4l4 4-4 4"
      />
    </svg>
  );
}

interface CsvQueryResultGridProps {
  columns: CsvQueryColumn[];
  rows: Record<string, unknown>[];
  rowCount: number;
  truncated: boolean;
  pagination?: CsvQueryResultPagination;
}

function formatCell(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function pageCount(totalCount: number, pageSize: number): number {
  return Math.max(1, Math.ceil(totalCount / pageSize));
}

export default function CsvQueryResultGrid({
  columns,
  rows,
  rowCount,
  truncated,
  pagination,
}: CsvQueryResultGridProps) {
  const { resolved } = useAppTheme();
  const totalPages = pagination
    ? pageCount(pagination.totalCount, pagination.pageSize)
    : 1;
  const currentPage = pagination
    ? Math.min(pagination.page, totalPages - 1)
    : 0;

  const gridColumns = useMemo<Column<ResultRow>[]>(
    () =>
      columns.map((column) => ({
        key: column.name,
        name: column.name,
        resizable: true,
        minWidth: 80,
        width: 140,
        renderCell: ({ row }) => formatCell(row[column.name]),
      })),
    [columns],
  );

  const gridRows = useMemo<ResultRow[]>(
    () => rows.map((row, index) => ({ ...row, id: index })),
    [rows],
  );

  const gridThemeClass =
    resolved.ui === 'dark' ? 'rdg-dark' : 'rdg-light';

  const metaText = pagination
    ? pagination.autoPaginate
      ? `共 ${pagination.totalCount} 行 · 第 ${currentPage + 1}/${totalPages} 页`
      : `共 ${rowCount} 行`
    : `${rowCount} 行`;

  return (
    <div className="CsvQueryResultGrid">
      <div className="CsvQueryResultGrid__meta">
        <span>
          {metaText}
          {truncated ? '（已截断显示）' : ''}
        </span>
        {pagination ? (
          <div className="CsvQueryResultGrid__pagination">
            {pagination.autoPaginate ? (
              <div role="navigation" aria-label="结果分页">
                <button
                  type="button"
                  className="CsvQueryResultGrid__pageBtn"
                  title="上一页"
                  aria-label="上一页"
                  disabled={currentPage <= 0}
                  onClick={() => pagination.onPageChange(currentPage - 1)}
                >
                  <ChevronLeftIcon />
                </button>
                <button
                  type="button"
                  className="CsvQueryResultGrid__pageBtn"
                  title="下一页"
                  aria-label="下一页"
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => pagination.onPageChange(currentPage + 1)}
                >
                  <ChevronRightIcon />
                </button>
              </div>
            ) : null}
            <label className="CsvQueryResultGrid__autoPaginate">
              <input
                type="checkbox"
                role="switch"
                checked={pagination.autoPaginate}
                onChange={(event) =>
                  pagination.onAutoPaginateChange(event.target.checked)
                }
              />
              <span>自动分页</span>
            </label>
          </div>
        ) : null}
      </div>
      <DataGrid
        className={`CsvQueryResultGrid__grid ${gridThemeClass}`}
        columns={gridColumns}
        rows={gridRows}
        rowKeyGetter={(row) => row.id}
        rowHeight={28}
        headerRowHeight={28}
      />
    </div>
  );
}
