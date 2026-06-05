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
  csvColumnHeader,
  csvColumnKey,
  getCsvColumnCount,
  gridRowsToMatrix,
  matrixToGridRows,
  parseCsv,
  serializeCsv,
  type CsvGridRow,
} from '../../lib/csv';
import type { EditorTab } from '../../types/tab';
import './CsvSpreadsheetView.css';

interface CsvSpreadsheetViewProps {
  tab: EditorTab;
  onChange: (content: string) => void;
}

function buildColumns(
  colCount: number,
  editable: boolean,
): Column<CsvGridRow>[] {
  return Array.from({ length: colCount }, (_, columnIndex) => ({
    key: csvColumnKey(columnIndex),
    name: csvColumnHeader(columnIndex),
    editable,
    width: 120,
    minWidth: 80,
    resizable: true,
  }));
}

export default function CsvSpreadsheetView({
  tab,
  onChange,
}: CsvSpreadsheetViewProps) {
  const { resolved } = useAppTheme();
  const skipSyncRef = useRef(false);
  const [colCount, setColCount] = useState(() =>
    getCsvColumnCount(parseCsv(tab.content)),
  );
  const [rows, setRows] = useState<CsvGridRow[]>(() =>
    matrixToGridRows(parseCsv(tab.content)),
  );

  useEffect(() => {
    if (tab.viewMode !== 'preview') return;
    if (skipSyncRef.current) {
      skipSyncRef.current = false;
      return;
    }
    const matrix = parseCsv(tab.content);
    setColCount(getCsvColumnCount(matrix));
    setRows(matrixToGridRows(matrix));
  }, [tab.content, tab.viewMode]);

  const columns = useMemo(
    () => buildColumns(colCount, !tab.truncated),
    [colCount, tab.truncated],
  );

  const handleRowsChange = useCallback(
    (nextRows: CsvGridRow[]) => {
      if (tab.truncated) return;
      setRows(nextRows);
      skipSyncRef.current = true;
      onChange(serializeCsv(gridRowsToMatrix(nextRows, colCount)));
    },
    [colCount, onChange, tab.truncated],
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
