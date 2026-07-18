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
  collectSchemeTerminalCompletions,
  completionInsertSuffix,
  type SchemeTerminalCompletionMatch,
} from '../../lib/scheme/schemeTerminalCompletion';
import { applySchemeInputLineHighlight } from '../../lib/scheme/schemeTerminalHighlight';
import {
  extractSchemeCompletionPrefix,
  getTerminalGridRowElement,
  parseSchemeTerminalInputLine,
  readTerminalRowText,
} from '../../lib/scheme/schemeTerminalInputLine';
import {
  estimateSchemeTerminalGrid,
  SCHEME_TERMINAL_DEFAULT_CHAR_WIDTH,
  SCHEME_TERMINAL_DEFAULT_ROW_HEIGHT,
  SCHEME_TERMINAL_PADDING_X,
  SCHEME_TERMINAL_PADDING_Y,
} from '../../lib/scheme/schemeTerminalSize';
import { patchWtermHiddenInputA11y } from '../../lib/wtermInputA11y';
import {
  extractSchemeTopLevelSymbols,
  mergeSchemeTerminalSymbols,
} from '../../lib/scheme/schemeTerminalSymbolTracker';
import SchemeTerminalCompletionPopup from './SchemeTerminalCompletionPopup';
import './SchemeTerminalPane.css';
import './SchemeTerminalCompletionPopup.css';

interface SchemeTerminalPaneProps {
  sessionId: string;
  initialSymbols?: readonly string[];
  /** 面板拖拽调高度时冻结网格重算，避免终端内容跳动 */
  resizeFrozen?: boolean;
  onExit?: (exitCode: number) => void;
}

interface TerminalMetrics {
  charWidth: number;
  rowHeight: number;
  paddingX: number;
  paddingY: number;
}

interface CompletionState {
  prefix: string;
  matches: SchemeTerminalCompletionMatch[];
  selectedIndex: number;
  anchor: { left: number; top: number };
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
  void window.muled.scheme.pty.resize({ sessionId, cols, rows });
}

function lockTerminalViewport(element: HTMLElement): void {
  element.style.height = '100%';
  element.style.maxHeight = '100%';
  element.style.overflowX = 'hidden';
  element.style.overflowY = 'auto';
}

export default function SchemeTerminalPane({
  sessionId,
  initialSymbols = [],
  resizeFrozen = false,
  onExit,
}: SchemeTerminalPaneProps) {
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
  const highlightFrameRef = useRef<number | null>(null);
  const lastHighlightKeyRef = useRef('');
  const envSymbolsRef = useRef<string[]>([]);
  const completionRef = useRef<CompletionState | null>(null);
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
  const [completion, setCompletion] = useState<CompletionState | null>(null);

  const clearCompletion = useCallback(() => {
    completionRef.current = null;
    setCompletion(null);
  }, []);

  const applyInputLineHighlight = useCallback(() => {
    const wt = wtermRef.current;
    const bridge = wt?.bridge;
    if (!wt || !bridge) return;

    const cursor = bridge.getCursor();
    const cols = bridge.getCols();
    const lineText = readTerminalRowText(bridge, cursor.row, cols);
    const parsed = parseSchemeTerminalInputLine(lineText, cursor.col);
    if (!parsed) {
      lastHighlightKeyRef.current = '';
      return;
    }

    const highlightKey = `${cursor.row}:${cursor.col}:${parsed.input}`;
    if (highlightKey === lastHighlightKeyRef.current) return;

    const scrollbackCount = bridge.getScrollbackCount();
    const rowEl = getTerminalGridRowElement(
      wt.element,
      scrollbackCount,
      cursor.row,
    );
    if (!rowEl) return;

    applySchemeInputLineHighlight(
      rowEl,
      parsed.promptLen,
      parsed.input,
      parsed.cursorCol - parsed.promptLen,
      cols,
    );
    lastHighlightKeyRef.current = highlightKey;
  }, []);

  const scheduleInputLineHighlight = useCallback(() => {
    if (highlightFrameRef.current !== null) {
      cancelAnimationFrame(highlightFrameRef.current);
    }
    highlightFrameRef.current = requestAnimationFrame(() => {
      highlightFrameRef.current = requestAnimationFrame(() => {
        highlightFrameRef.current = null;
        applyInputLineHighlight();
      });
    });
  }, [applyInputLineHighlight]);

  const getCompletionAnchor = useCallback(
    (promptLen: number, prefixStartCol: number) => {
      const shell = shellRef.current;
      const wt = wtermRef.current;
      if (!shell || !wt?.bridge) return null;

      const cursor = wt.bridge.getCursor();
      const { charWidth, rowHeight } = metricsRef.current;
      const termStyles = getComputedStyle(wt.element);
      const padLeft = parseFloat(termStyles.paddingLeft) || 0;
      const padTop = parseFloat(termStyles.paddingTop) || 0;

      const left =
        padLeft + (promptLen + prefixStartCol) * charWidth - shell.scrollLeft;
      const top =
        padTop + (cursor.row + 1) * rowHeight - shell.scrollTop + 2;

      return { left, top };
    },
    [],
  );

  const openCompletion = useCallback(
    (prefix: string, prefixStartCol: number, promptLen: number) => {
      const matches = collectSchemeTerminalCompletions({
        prefix,
        envSymbols: envSymbolsRef.current,
      });
      if (matches.length === 0) {
        clearCompletion();
        return;
      }

      const anchor = getCompletionAnchor(promptLen, prefixStartCol);
      if (!anchor) return;

      const next: CompletionState = {
        prefix,
        matches,
        selectedIndex: 0,
        anchor,
      };
      completionRef.current = next;
      setCompletion(next);
    },
    [clearCompletion, getCompletionAnchor],
  );

  const applyCompletion = useCallback(
    (match: SchemeTerminalCompletionMatch) => {
      const active = completionRef.current;
      if (!active) return;
      const suffix = completionInsertSuffix(active.prefix, match.label);
      clearCompletion();
      if (!suffix) return;
      void window.muled.scheme.pty.write({
        sessionId: sessionIdRef.current,
        data: suffix,
      });
      scheduleInputLineHighlight();
      focus();
    },
    [clearCompletion, focus, scheduleInputLineHighlight],
  );

  const handleTabCompletion = useCallback(() => {
    const wt = wtermRef.current;
    const bridge = wt?.bridge;
    if (!bridge) return;

    const cursor = bridge.getCursor();
    const cols = bridge.getCols();
    const lineText = readTerminalRowText(bridge, cursor.row, cols);
    const parsed = parseSchemeTerminalInputLine(lineText, cursor.col);
    if (!parsed) return;

    const { prefix, startCol } = extractSchemeCompletionPrefix(
      parsed.input,
      parsed.cursorCol - parsed.promptLen,
    );

    const active = completionRef.current;
    if (
      active &&
      active.prefix === prefix &&
      active.matches.length > 0
    ) {
      const nextIndex = (active.selectedIndex + 1) % active.matches.length;
      const next = { ...active, selectedIndex: nextIndex };
      completionRef.current = next;
      setCompletion(next);
      return;
    }

    openCompletion(prefix, startCol, parsed.promptLen);
  }, [openCompletion]);

  const trackSubmittedInputSymbols = useCallback(() => {
    const wt = wtermRef.current;
    const bridge = wt?.bridge;
    if (!bridge) return;

    const cursor = bridge.getCursor();
    const cols = bridge.getCols();
    const lineText = readTerminalRowText(bridge, cursor.row, cols);
    const parsed = parseSchemeTerminalInputLine(lineText, cursor.col);
    if (!parsed?.input) return;

    envSymbolsRef.current = mergeSchemeTerminalSymbols(
      envSymbolsRef.current,
      extractSchemeTopLevelSymbols(parsed.input),
    );
  }, []);

  const flushPendingData = useCallback(() => {
    if (pendingDataRef.current.length === 0) return;
    pendingDataRef.current.forEach((chunk) => {
      write(chunk);
    });
    pendingDataRef.current = [];
    scheduleInputLineHighlight();
  }, [scheduleInputLineHighlight, write]);

  const writeFromPty = useCallback(
    (data: string) => {
      if (!readyRef.current) {
        pendingDataRef.current.push(data);
        return;
      }
      write(data);
      scheduleInputLineHighlight();
    },
    [scheduleInputLineHighlight, write],
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
    scheduleInputLineHighlight();

    if (el && !wasAtBottom) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (wtermRef.current?.element === el) {
            el.scrollTop = savedScrollTop;
          }
        });
      });
    }
  }, [resize, scheduleInputLineHighlight]);

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
    const unsubData = window.muled.scheme.pty.onData(({ sessionId: id, data }) => {
      if (id !== sessionIdRef.current) return;
      writeFromPty(data);
    });
    const unsubExit = window.muled.scheme.pty.onExit(({ sessionId: id, exitCode }) => {
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
    lastHighlightKeyRef.current = '';
    envSymbolsRef.current = [...initialSymbols];
    completionRef.current = null;
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
      if (highlightFrameRef.current !== null) {
        cancelAnimationFrame(highlightFrameRef.current);
        highlightFrameRef.current = null;
      }
      clearCompletion();
    };
  }, [clearCompletion, initialSymbols, scheduleTerminalSize, sessionId]);

  useEffect(() => {
    if (!resizeFrozen) {
      scheduleTerminalSize();
    }
  }, [resizeFrozen, scheduleTerminalSize]);

  const handleData = useCallback(
    (data: string) => {
      if (data === '\t') {
        handleTabCompletion();
        return;
      }

      if (completionRef.current) {
        if (data === '\x1b[A') {
          const active = completionRef.current;
          const nextIndex =
            (active.selectedIndex - 1 + active.matches.length) %
            active.matches.length;
          const next = { ...active, selectedIndex: nextIndex };
          completionRef.current = next;
          setCompletion(next);
          return;
        }
        if (data === '\x1b[B') {
          const active = completionRef.current;
          const nextIndex = (active.selectedIndex + 1) % active.matches.length;
          const next = { ...active, selectedIndex: nextIndex };
          completionRef.current = next;
          setCompletion(next);
          return;
        }
        if (data === '\r') {
          const active = completionRef.current;
          applyCompletion(active.matches[active.selectedIndex]);
          scheduleInputLineHighlight();
          return;
        }
        clearCompletion();
      }

      if (data === '\r') {
        trackSubmittedInputSymbols();
      }

      void window.muled.scheme.pty.write({
        sessionId: sessionIdRef.current,
        data,
      });
      scheduleInputLineHighlight();
    },
    [applyCompletion, clearCompletion, handleTabCompletion, scheduleInputLineHighlight, trackSubmittedInputSymbols],
  );

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
      <SchemeTerminalCompletionPopup
        open={completion !== null}
        matches={completion?.matches ?? []}
        selectedIndex={completion?.selectedIndex ?? 0}
        anchor={completion?.anchor ?? null}
        prefix={completion?.prefix ?? ''}
        onSelect={(index) => {
          const active = completionRef.current;
          if (!active) return;
          applyCompletion(active.matches[index]);
        }}
        onDismiss={clearCompletion}
      />
    </div>
  );
}
