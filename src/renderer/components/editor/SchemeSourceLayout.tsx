import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  SCHEME_EDITOR_MIN_HEIGHT,
  SCHEME_OUTPUT_DEFAULT_HEIGHT,
  SCHEME_OUTPUT_MAX_HEIGHT,
  SCHEME_OUTPUT_MIN_HEIGHT,
} from '../../lib/scheme/schemeOutputConstants';
import { useVerticalDragSize } from '../../hooks/useVerticalDragSize';
import SchemeTerminalPane from './SchemeTerminalPane';
import './SchemeSourceLayout.css';
import './SchemeTerminalPane.css';

/** 运行结果面板高度下限 */
export {
  SCHEME_EDITOR_MIN_HEIGHT,
  SCHEME_OUTPUT_DEFAULT_HEIGHT,
  SCHEME_OUTPUT_MAX_HEIGHT,
  SCHEME_OUTPUT_MIN_HEIGHT,
} from '../../lib/scheme/schemeOutputConstants';

interface SchemeSourceLayoutProps {
  terminalSessionId: string | null;
  terminalInitialSymbols?: readonly string[];
  onCloseTerminal?: () => void;
  onTerminalExit?: (exitCode: number) => void;
  children: ReactNode;
}

function getOutputMaxHeight(containerHeight: number): number {
  const dynamicMax = containerHeight - SCHEME_EDITOR_MIN_HEIGHT;
  return Math.max(
    SCHEME_OUTPUT_MIN_HEIGHT,
    Math.min(SCHEME_OUTPUT_MAX_HEIGHT, dynamicMax),
  );
}

export default function SchemeSourceLayout({
  terminalSessionId,
  terminalInitialSymbols = [],
  onCloseTerminal,
  onTerminalExit,
  children,
}: SchemeSourceLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const outputShellRef = useRef<HTMLDivElement>(null);
  const [panelHeight, setPanelHeight] = useState(SCHEME_OUTPUT_DEFAULT_HEIGHT);

  const clampPanelHeight = useCallback((next: number) => {
    const containerHeight = containerRef.current?.clientHeight ?? 0;
    const max =
      containerHeight > 0
        ? getOutputMaxHeight(containerHeight)
        : SCHEME_OUTPUT_MAX_HEIGHT;
    return Math.min(max, Math.max(SCHEME_OUTPUT_MIN_HEIGHT, next));
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
      ? getOutputMaxHeight(containerHeight)
      : SCHEME_OUTPUT_MAX_HEIGHT;
  }, []);

  const { dragging: resizingOutput, handleProps: outputResizeHandleProps } =
    useVerticalDragSize({
      value: panelHeight,
      min: SCHEME_OUTPUT_MIN_HEIGHT,
      max: SCHEME_OUTPUT_MAX_HEIGHT,
      resolveMax: resolvePanelMax,
      onChange: handlePanelHeightChange,
      liveTargetRef: outputShellRef,
      invertDelta: true,
      ariaLabel: '调整 Scheme 终端面板高度',
    });

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !terminalSessionId) return undefined;

    let frameId: number | null = null;
    const syncMax = () => {
      if (frameId !== null) cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        frameId = null;
        setPanelHeight((current) => clampPanelHeight(current));
      });
    };

    const observer = new ResizeObserver(syncMax);
    observer.observe(container);
    return () => {
      observer.disconnect();
      if (frameId !== null) cancelAnimationFrame(frameId);
    };
  }, [clampPanelHeight, terminalSessionId]);

  const showTerminal = terminalSessionId !== null;

  return (
    <div
      ref={containerRef}
      className={`SchemeSourceLayout${resizingOutput ? ' SchemeSourceLayout--resizing' : ''}`}
    >
      <div className="SchemeSourceLayout__editor">{children}</div>
      {showTerminal && terminalSessionId ? (
        <>
          <div
            className={`SchemeSourceLayout__resize${resizingOutput ? ' SchemeSourceLayout__resize--active' : ''}`}
            {...outputResizeHandleProps}
          />
          <div
            ref={outputShellRef}
            className="SchemeSourceLayout__outputShell"
            style={{ height: panelHeight }}
          >
            <div className="SchemeSourceLayout__terminalHeader">
              <span className="SchemeSourceLayout__terminalTitle">
                Chez Scheme REPL
              </span>
              {onCloseTerminal ? (
                <button
                  type="button"
                  className="SchemeSourceLayout__terminalClose"
                  title="关闭"
                  aria-label="关闭终端"
                  onClick={onCloseTerminal}
                >
                  ×
                </button>
              ) : null}
            </div>
            <div className="SchemeSourceLayout__terminalBody">
              <SchemeTerminalPane
                sessionId={terminalSessionId}
                initialSymbols={terminalInitialSymbols}
                resizeFrozen={resizingOutput}
                onExit={onTerminalExit}
              />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
