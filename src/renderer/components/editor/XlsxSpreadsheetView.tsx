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
import { dataUrlToArrayBuffer } from '../../lib/dataUrl';
import { registerXlsxEditorHandlers } from '../../lib/editorXlsxBridge';
import {
  buildXlsxColumnNames,
  csvColumnKey,
  getXlsxColumnCount,
  gridRowsToXlsxMatrix,
  parseXlsxBuffer,
  serializeXlsxWorkbook,
  xlsxMatrixToGridRows,
  type CsvGridRow,
  type XlsxWorkbookData,
} from '../../lib/xlsx';
import type { EditorTab } from '../../types/tab';
import './XlsxSpreadsheetView.css';

interface XlsxSpreadsheetViewProps {
  tab: EditorTab;
  onDirty: () => void;
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

export default function XlsxSpreadsheetView({
  tab,
  onDirty,
}: XlsxSpreadsheetViewProps) {
  const { resolved } = useAppTheme();
  const workbookRef = useRef<XlsxWorkbookData | null>(null);
  const [workbookData, setWorkbookData] = useState<XlsxWorkbookData | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!tab.xlsxSrc) {
      setWorkbookData(null);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    (async () => {
      try {
        const buffer = dataUrlToArrayBuffer(tab.xlsxSrc!);
        const parsed = await parseXlsxBuffer(buffer);
        if (cancelled) return;
        workbookRef.current = parsed;
        setWorkbookData(parsed);
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : String(error);
        setLoadError(message);
        setWorkbookData(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tab.xlsxSrc]);

  useEffect(() => {
    workbookRef.current = workbookData;
  }, [workbookData]);

  useEffect(() => {
    registerXlsxEditorHandlers(tab.id, {
      saveToBuffer: async () => {
        if (!workbookRef.current) return null;
        return serializeXlsxWorkbook(workbookRef.current);
      },
    });
    return () => registerXlsxEditorHandlers(tab.id, null);
  }, [tab.id]);

  const activeSheetIndex = workbookData?.activeSheetIndex ?? 0;
  const activeSheet = workbookData?.sheets[activeSheetIndex] ?? null;
  const colCount = activeSheet ? getXlsxColumnCount(activeSheet.matrix) : 1;
  const columnNames = useMemo(
    () => buildXlsxColumnNames(colCount),
    [colCount],
  );
  const rows = useMemo(
    () => (activeSheet ? xlsxMatrixToGridRows(activeSheet.matrix) : []),
    [activeSheet],
  );

  const columns = useMemo(
    () => buildColumns(colCount, columnNames, !tab.truncated),
    [colCount, columnNames, tab.truncated],
  );

  const handleSheetChange = useCallback((sheetIndex: number) => {
    setWorkbookData((current) => {
      if (!current || current.activeSheetIndex === sheetIndex) {
        return current;
      }
      const next = { ...current, activeSheetIndex: sheetIndex };
      workbookRef.current = next;
      return next;
    });
  }, []);

  const handleRowsChange = useCallback(
    (nextRows: CsvGridRow[]) => {
      if (tab.truncated || !workbookData || !activeSheet) return;

      const nextMatrix = gridRowsToXlsxMatrix(nextRows, colCount);

      setWorkbookData((current) => {
        if (!current) return current;
        const nextSheets = current.sheets.map((sheet, index) =>
          index === current.activeSheetIndex
            ? { ...sheet, matrix: nextMatrix }
            : sheet,
        );
        const next = { ...current, sheets: nextSheets };
        workbookRef.current = next;
        return next;
      });
      onDirty();
    },
    [activeSheet, colCount, onDirty, tab.truncated, workbookData],
  );

  const rowKeyGetter = useCallback((row: CsvGridRow) => row.id, []);

  const gridThemeClass = resolved.ui === 'dark' ? 'rdg-dark' : 'rdg-light';
  const gridStyle = {
    '--rdg-selection-color': 'var(--muled-accent)',
    '--rdg-font-size': '13px',
  } as CSSProperties;

  if (loading) {
    return (
      <div className="XlsxSpreadsheetView XlsxSpreadsheetView--loading">
        加载 Excel…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="XlsxSpreadsheetView XlsxSpreadsheetView--error" role="alert">
        无法加载 Excel：{loadError}
      </div>
    );
  }

  if (!workbookData || !activeSheet) {
    return (
      <div className="XlsxSpreadsheetView XlsxSpreadsheetView--loading">
        无工作表
      </div>
    );
  }

  return (
    <div
      className={`XlsxSpreadsheetView${
        workbookData.sheets.length > 1 ? ' XlsxSpreadsheetView--withSheets' : ''
      }`}
    >
      {workbookData.sheets.length > 1 ? (
        <div
          className="XlsxSpreadsheetView__sheetTabs"
          role="tablist"
          aria-label="工作表"
        >
          {workbookData.sheets.map((sheet, index) => (
            <button
              key={`${sheet.name}:${index}`}
              type="button"
              role="tab"
              aria-selected={index === activeSheetIndex}
              className={`XlsxSpreadsheetView__sheetTab${
                index === activeSheetIndex
                  ? ' XlsxSpreadsheetView__sheetTab--active'
                  : ''
              }`}
              onClick={() => handleSheetChange(index)}
            >
              {sheet.name}
            </button>
          ))}
        </div>
      ) : null}
      <DataGrid
        className={`XlsxSpreadsheetView__grid ${gridThemeClass}`}
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
