import { useMemo } from 'react';
import { DataGrid, type Column } from 'react-data-grid';
import 'react-data-grid/lib/styles.css';
import { useAppTheme } from '../../hooks/useAppTheme';
import type { CsvQueryColumn } from '../../shared/types/csvQuery';
import './CsvQueryResultGrid.css';

type ResultRow = Record<string, unknown> & { id: number };

interface CsvQueryResultGridProps {
  columns: CsvQueryColumn[];
  rows: Record<string, unknown>[];
  rowCount: number;
  truncated: boolean;
}

function formatCell(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export default function CsvQueryResultGrid({
  columns,
  rows,
  rowCount,
  truncated,
}: CsvQueryResultGridProps) {
  const { resolved } = useAppTheme();

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

  return (
    <div className="CsvQueryResultGrid">
      <div className="CsvQueryResultGrid__meta">
        {rowCount} 行{truncated ? '（已截断显示）' : ''}
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
