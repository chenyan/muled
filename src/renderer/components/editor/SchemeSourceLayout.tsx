import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useVerticalDragSize } from '../../hooks/useVerticalDragSize';
import {
  formatSchemeRunOutput,
  type SchemeRunOutput,
} from '../../lib/scheme/schemeRunClient';
import './SchemeSourceLayout.css';

/** 运行结果面板高度下限 */
export const SCHEME_OUTPUT_MIN_HEIGHT = 80;
/** 运行结果面板默认高度 */
export const SCHEME_OUTPUT_DEFAULT_HEIGHT = 160;
/** 运行结果面板高度上限（绝对值） */
export const SCHEME_OUTPUT_MAX_HEIGHT = 480;
/** 显示运行结果时编辑器区域保留高度下限 */
export const SCHEME_EDITOR_MIN_HEIGHT = 120;

interface SchemeSourceLayoutProps {
  output: SchemeRunOutput | null;
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
  output,
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
      ariaLabel: '调整 Scheme 运行结果面板高度',
    });

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !output) return undefined;

    const syncMax = () => {
      setPanelHeight((current) => clampPanelHeight(current));
    };

    const observer = new ResizeObserver(syncMax);
    observer.observe(container);
    return () => observer.disconnect();
  }, [clampPanelHeight, output]);

  const showOutput = output !== null;
  const combinedOutput = output ? formatSchemeRunOutput(output) : '';

  return (
    <div
      ref={containerRef}
      className={`SchemeSourceLayout${resizingOutput ? ' SchemeSourceLayout--resizing' : ''}`}
    >
      <div className="SchemeSourceLayout__editor">{children}</div>
      {showOutput ? (
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
            <div
              className={`SchemeSourceLayout__output${
                output.exitCode !== 0
                  ? ' SchemeSourceLayout__output--error'
                  : ''
              }`}
              aria-live="polite"
            >
              {combinedOutput || `(exit ${output.exitCode})`}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
