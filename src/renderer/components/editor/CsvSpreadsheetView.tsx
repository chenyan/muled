import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { DataGrid, type Column } from 'react-data-grid';
import 'react-data-grid/lib/styles.css';
import { useAppTheme } from '../../hooks/useAppTheme';
import {
  csvColumnKey,
  getCsvColumnCount,
  gridRowsToMatrix,
  matrixToGridRows,
  parseCsv,
  serializeCsvWithHeader,
  type CsvGridRow,
} from '../../lib/csv';
import { sniffCsvMatrix } from '../../lib/csvSniffer';
import type { EditorTab } from '../../types/tab';
import './CsvSpreadsheetView.css';

interface CsvSpreadsheetViewProps {
  tab: EditorTab;
  onChange: (content: string) => void;
}

function buildColumns(
  colCount: number,
  columnNames: readonly string[],
  editable: boolean,
): Column<CsvGridRow>[] {
  return Array.from({ length: colCount }, (_, columnIndex) => ({
    key: csvColumnKey(columnIndex),
    name: columnNames[columnIndex] ?? `column${columnIndex}`,
    editable,
    width: 120,
    minWidth: 80,
    resizable: true,
  }));
}

function sniffFromContent(content: string) {
  const sniffed = sniffCsvMatrix(parseCsv(content));
  return {
    ...sniffed,
    rows: matrixToGridRows(sniffed.dataMatrix),
    colCount: getCsvColumnCount(sniffed.dataMatrix),
  };
}

export default function CsvSpreadsheetView({
  tab,
  onChange,
}: CsvSpreadsheetViewProps) {
  const { resolved } = useAppTheme();
  const skipSyncRef = useRef(false);
  const [sniffState, setSniffState] = useState(() => sniffFromContent(tab.content));
  const { colCount, columnNames, hasHeader, rows } = sniffState;

  useEffect(() => {
    if (tab.viewMode !== 'preview') return;
    if (skipSyncRef.current) {
      skipSyncRef.current = false;
      return;
    }
    setSniffState(sniffFromContent(tab.content));
  }, [tab.content, tab.viewMode]);

  const columns = useMemo(
    () => buildColumns(colCount, columnNames, !tab.truncated),
    [colCount, columnNames, tab.truncated],
  );

  const handleRowsChange = useCallback(
    (nextRows: CsvGridRow[]) => {
      if (tab.truncated) return;
      setSniffState((current) => ({ ...current, rows: nextRows }));
      skipSyncRef.current = true;
      onChange(
        serializeCsvWithHeader(
          gridRowsToMatrix(nextRows, colCount),
          columnNames,
          hasHeader,
        ),
      );
    },
    [colCount, columnNames, hasHeader, onChange, tab.truncated],
  );

  const rowKeyGetter = useCallback((row: CsvGridRow) => row.id, []);

  const gridThemeClass =
    resolved.ui === 'dark' ? 'rdg-dark' : 'rdg-light';

  const gridStyle = {
    '--rdg-selection-color': 'var(--muled-accent)',
    '--rdg-font-size': '13px',
  } as CSSProperties;

  return (
    <div className="CsvSpreadsheetView">
      <DataGrid
        className={`CsvSpreadsheetView__grid ${gridThemeClass}`}
        style={gridStyle}
        columns={columns}
        rows={rows}
        rowKeyGetter={rowKeyGetter}
        onRowsChange={tab.truncated ? undefined : handleRowsChange}
        rowHeight={32}
        headerRowHeight={32}
      />
    </div>
  );
}
