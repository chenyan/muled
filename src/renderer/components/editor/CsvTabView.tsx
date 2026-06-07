import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { EditorTab } from '../../types/tab';
import { useVerticalDragSize } from '../../hooks/useVerticalDragSize';
import CsvQueryPanel from './CsvQueryPanel';
import './CsvTabView.css';

/** 查询面板整体高度下限（含标题栏） */
export const QUERY_PANEL_MIN_HEIGHT = 160;
/** 查询面板整体高度默认 */
export const QUERY_PANEL_DEFAULT_HEIGHT = 320;
/** 上方 CSV 编辑区保留高度下限 */
export const QUERY_PANEL_MAIN_MIN_HEIGHT = 120;

interface CsvTabViewProps {
  tab: EditorTab;
  children: ReactNode;
}

function getQueryPanelMaxHeight(containerHeight: number): number {
  return Math.max(
    QUERY_PANEL_MIN_HEIGHT,
    containerHeight - QUERY_PANEL_MAIN_MIN_HEIGHT,
  );
}

export default function CsvTabView({ tab, children }: CsvTabViewProps) {
  const [queryMaximized, setQueryMaximized] = useState(false);
  const [queryExpanded, setQueryExpanded] = useState(false);
  const [panelHeight, setPanelHeight] = useState(QUERY_PANEL_DEFAULT_HEIGHT);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelShellRef = useRef<HTMLDivElement>(null);

  const clampPanelHeight = useCallback((next: number) => {
    const containerHeight = containerRef.current?.clientHeight ?? 0;
    const max =
      containerHeight > 0
        ? getQueryPanelMaxHeight(containerHeight)
        : QUERY_PANEL_DEFAULT_HEIGHT;
    return Math.min(max, Math.max(QUERY_PANEL_MIN_HEIGHT, next));
  }, []);

  const handlePanelHeightChange = useCallback(
    (next: number) => {
      setPanelHeight(clampPanelHeight(next));
    },
    [clampPanelHeight],
  );

  const resolvePanelMax = useCallback(() => {
    const containerHeight = containerRef.current?.clientHeight ?? 0;
    return containerHeight > 0
      ? getQueryPanelMaxHeight(containerHeight)
      : QUERY_PANEL_DEFAULT_HEIGHT;
  }, []);

  const { dragging: resizingPanel, handleProps: panelResizeHandleProps } =
    useVerticalDragSize({
      value: panelHeight,
      min: QUERY_PANEL_MIN_HEIGHT,
      max: QUERY_PANEL_DEFAULT_HEIGHT,
      resolveMax: resolvePanelMax,
      onChange: handlePanelHeightChange,
      liveTargetRef: panelShellRef,
      invertDelta: true,
      ariaLabel: '调整 SQL 查询面板高度',
    });

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !queryExpanded || queryMaximized) return undefined;

    const syncMax = () => {
      setPanelHeight((current) => clampPanelHeight(current));
    };

    const observer = new ResizeObserver(syncMax);
    observer.observe(container);
    return () => observer.disconnect();
  }, [clampPanelHeight, queryExpanded, queryMaximized]);

  const showPanelResize = queryExpanded && !queryMaximized;

  return (
    <div
      ref={containerRef}
      className={`CsvTabView${queryMaximized ? ' CsvTabView--queryMaximized' : ''}${resizingPanel ? ' CsvTabView--resizingPanel' : ''}`}
    >
      <div className="CsvTabView__main">{children}</div>
      {showPanelResize ? (
        <div
          className={`CsvTabView__panelResize${resizingPanel ? ' CsvTabView__panelResize--active' : ''}`}
          {...panelResizeHandleProps}
        />
      ) : null}
      <div
        ref={panelShellRef}
        className={`CsvTabView__panelShell${showPanelResize ? ' CsvTabView__panelShell--sized' : ''}`}
        style={showPanelResize ? { height: panelHeight } : undefined}
      >
        <CsvQueryPanel
          tab={tab}
          maximized={queryMaximized}
          onMaximizedChange={setQueryMaximized}
          onExpandedChange={setQueryExpanded}
        />
      </div>
    </div>
  );
}
