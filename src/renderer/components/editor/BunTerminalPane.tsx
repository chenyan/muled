import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type { WTerm } from '@wterm/dom';
import { Terminal, useTerminal } from '@wterm/react';
import '@wterm/react/css';
import {
  estimateSchemeTerminalGrid,
  SCHEME_TERMINAL_DEFAULT_CHAR_WIDTH,
  SCHEME_TERMINAL_DEFAULT_ROW_HEIGHT,
  SCHEME_TERMINAL_PADDING_X,
  SCHEME_TERMINAL_PADDING_Y,
} from '../../lib/scheme/schemeTerminalSize';
import { patchWtermHiddenInputA11y } from '../../lib/wtermInputA11y';
import './SchemeTerminalPane.css';

interface BunTerminalPaneProps {
  sessionId: string;
  resizeFrozen?: boolean;
  onExit?: (exitCode: number) => void;
}

interface TerminalMetrics {
  charWidth: number;
  rowHeight: number;
  paddingX: number;
  paddingY: number;
}

const DEFAULT_TERMINAL_METRICS: TerminalMetrics = {
  charWidth: SCHEME_TERMINAL_DEFAULT_CHAR_WIDTH,
  rowHeight: SCHEME_TERMINAL_DEFAULT_ROW_HEIGHT,
  paddingX: SCHEME_TERMINAL_PADDING_X,
  paddingY: SCHEME_TERMINAL_PADDING_Y,
};

function measureTerminalMetrics(element: HTMLElement): TerminalMetrics | null {
  const grid = element.querySelector('.term-grid');
  if (!grid) return null;

  const row = document.createElement('div');
  row.className = 'term-row';
  row.style.visibility = 'hidden';
  row.style.position = 'absolute';
  const probe = document.createElement('span');
  probe.textContent = 'W';
  row.appendChild(probe);
  grid.appendChild(row);
  const charWidth = probe.getBoundingClientRect().width;
  const rowHeight = row.getBoundingClientRect().height;
  row.remove();

  if (charWidth <= 0 || rowHeight <= 0) return null;

  const cs = getComputedStyle(element);
  const paddingX =
    (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
  const paddingY =
    (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);

  return { charWidth, rowHeight, paddingX, paddingY };
}

function schedulePtyResize(
  sessionId: string,
  cols: number,
  rows: number,
): void {
  void window.muled.bun.pty.resize({ sessionId, cols, rows });
}

function lockTerminalViewport(element: HTMLElement): void {
  element.style.height = '100%';
  element.style.maxHeight = '100%';
  element.style.overflowX = 'hidden';
  element.style.overflowY = 'auto';
}

export default function BunTerminalPane({
  sessionId,
  resizeFrozen = false,
  onExit,
}: BunTerminalPaneProps) {
  const shellRef = useRef<HTMLDivElement>(null);
  const { ref: termRef, write, resize, focus } = useTerminal();
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;
  const metricsRef = useRef<TerminalMetrics>(DEFAULT_TERMINAL_METRICS);
  const lastSizeRef = useRef<{ cols: number; rows: number } | null>(null);
  const resizeFrameRef = useRef<number | null>(null);
  const readyRef = useRef(false);
  const pendingDataRef = useRef<string[]>([]);
  const wtermRef = useRef<WTerm | null>(null);
  const resizeFrozenRef = useRef(resizeFrozen);
  resizeFrozenRef.current = resizeFrozen;

  const [gridSize, setGridSize] = useState(() => {
    const shell = shellRef.current;
    if (!shell) {
      return estimateSchemeTerminalGrid({
        width: 640,
        height: 120,
      });
    }
    const rect = shell.getBoundingClientRect();
    return estimateSchemeTerminalGrid({
      width: rect.width,
      height: rect.height,
    });
  });

  const flushPendingData = useCallback(() => {
    if (pendingDataRef.current.length === 0) return;
    pendingDataRef.current.forEach((chunk) => {
      write(chunk);
    });
    pendingDataRef.current = [];
  }, [write]);

  const writeFromPty = useCallback(
    (data: string) => {
      if (!readyRef.current) {
        pendingDataRef.current.push(data);
        return;
      }
      write(data);
    },
    [write],
  );

  const applyTerminalSize = useCallback(() => {
    const shell = shellRef.current;
    if (!shell) return;

    const rect = shell.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const { charWidth, rowHeight, paddingX, paddingY } = metricsRef.current;
    const innerWidth = Math.max(0, rect.width - paddingX);
    const innerHeight = Math.max(0, rect.height - paddingY);
    const cols = Math.max(2, Math.floor(innerWidth / charWidth));
    const rows = Math.max(1, Math.floor(innerHeight / rowHeight));
    const last = lastSizeRef.current;
    if (last?.cols === cols && last?.rows === rows) return;

    const wt = wtermRef.current;
    const el = wt?.element;
    const wasAtBottom =
      el !== undefined &&
      el.scrollHeight - el.scrollTop - el.clientHeight < 5;
    const savedScrollTop = el?.scrollTop ?? 0;

    lastSizeRef.current = { cols, rows };
    setGridSize({ cols, rows });
    resize(cols, rows);
    if (wt) {
      lockTerminalViewport(wt.element);
    }
    schedulePtyResize(sessionIdRef.current, cols, rows);

    if (el && !wasAtBottom) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (wtermRef.current?.element === el) {
            el.scrollTop = savedScrollTop;
          }
        });
      });
    }
  }, [resize]);

  const scheduleTerminalSize = useCallback(() => {
    if (resizeFrameRef.current !== null) {
      cancelAnimationFrame(resizeFrameRef.current);
    }
    resizeFrameRef.current = requestAnimationFrame(() => {
      resizeFrameRef.current = null;
      applyTerminalSize();
    });
  }, [applyTerminalSize]);

  const markReady = useCallback(() => {
    if (readyRef.current) return;
    readyRef.current = true;
    applyTerminalSize();
    flushPendingData();
    focus();
  }, [applyTerminalSize, flushPendingData, focus]);

  const handleReady = useCallback(
    (wt: WTerm) => {
      wtermRef.current = wt;
      patchWtermHiddenInputA11y(wt.element);
      const measured = measureTerminalMetrics(wt.element);
      if (measured) {
        metricsRef.current = measured;
      }
      lockTerminalViewport(wt.element);
      scheduleTerminalSize();
      requestAnimationFrame(() => {
        markReady();
      });
    },
    [markReady, scheduleTerminalSize],
  );

  useLayoutEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    const rect = shell.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    setGridSize(
      estimateSchemeTerminalGrid({
        width: rect.width,
        height: rect.height,
        charWidth: metricsRef.current.charWidth,
        rowHeight: metricsRef.current.rowHeight,
        paddingX: metricsRef.current.paddingX,
        paddingY: metricsRef.current.paddingY,
      }),
    );
  }, [sessionId]);

  useEffect(() => {
    const unsubData = window.muled.bun.pty.onData(({ sessionId: id, data }) => {
      if (id !== sessionIdRef.current) return;
      writeFromPty(data);
    });
    const unsubExit = window.muled.bun.pty.onExit(({ sessionId: id, exitCode }) => {
      if (id !== sessionIdRef.current) return;
      onExit?.(exitCode);
    });
    return () => {
      unsubData();
      unsubExit();
    };
  }, [writeFromPty, onExit]);

  useEffect(() => {
    readyRef.current = false;
    pendingDataRef.current = [];
    wtermRef.current = null;
    lastSizeRef.current = null;
    metricsRef.current = DEFAULT_TERMINAL_METRICS;

    const shell = shellRef.current;
    if (!shell) return undefined;

    const observer = new ResizeObserver(() => {
      if (resizeFrozenRef.current) return;
      scheduleTerminalSize();
    });
    observer.observe(shell);
    if (!resizeFrozenRef.current) {
      scheduleTerminalSize();
    }

    return () => {
      observer.disconnect();
      if (resizeFrameRef.current !== null) {
        cancelAnimationFrame(resizeFrameRef.current);
        resizeFrameRef.current = null;
      }
    };
  }, [scheduleTerminalSize, sessionId]);

  useEffect(() => {
    if (!resizeFrozen) {
      scheduleTerminalSize();
    }
  }, [resizeFrozen, scheduleTerminalSize]);

  const handleData = useCallback((data: string) => {
    void window.muled.bun.pty.write({
      sessionId: sessionIdRef.current,
      data,
    });
  }, []);

  return (
    <div ref={shellRef} className="SchemeTerminalPane__shell">
      <Terminal
        ref={termRef}
        className="SchemeTerminalPane__terminal"
        cols={gridSize.cols}
        rows={gridSize.rows}
        autoResize={false}
        style={{ width: '100%', height: '100%', minHeight: 0 }}
        onReady={handleReady}
        onData={handleData}
      />
    </div>
  );
}
