import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import type { EditorFontSettings, EditorMode } from '../../../../shared/types/config';
import type {
  IpynbCellExecutionStatus,
  IpynbCellType,
  IpynbKernelStatus,
} from '../../../../shared/types/ipynb';
import type {
  JupyterServerKernelInfo,
  KernelSpec,
} from '../../../../shared/types/ipynbKernel';
import { isJupyterServerKernelSpec } from '../../../../shared/types/ipynbKernel';
import { sourceEditorFontVars } from '../../../lib/editorFontStyle';
import type { IpynbDocument, IpynbOutput } from '../../../../shared/types/ipynb';
import type { IpynbKernelVariable } from '../../../../shared/types/ipynbKernel';
import {
  addCell,
  appendOutputToList,
  changeCellType,
  clearCellOutputs,
  deleteCell,
  finalizeCellExecution,
  moveCell,
  serializeIpynbContent,
  updateCellSource,
} from '../../../lib/ipynb/ipynbModel';
import { parseIpynbJson } from '../../../../shared/ipynb/nbformat';
import {
  disposeIpynbKernel,
  executeIpynbCell,
  inspectIpynbKernel,
  interruptIpynbKernel,
  listIpynbKernels,
  restartIpynbKernel,
  startIpynbKernel,
  subscribeIpynbKernelEvents,
} from '../../../lib/ipynb/ipynbClient';
import {
  disposeIpynbKernelSessionRef,
  shouldDisposeIpynbKernelOnTabContextChange,
} from '../../../lib/ipynb/ipynbKernelSessionLifecycle';
import { useHorizontalDragSize } from '../../../hooks/useHorizontalDragSize';
import { nextIpynbCellSessionRunCount } from '../../../lib/ipynb/ipynbCellSessionRuns';
import {
  IPYNB_SIDEBAR_WIDTH_DEFAULT,
  IPYNB_SIDEBAR_WIDTH_MAX,
  IPYNB_SIDEBAR_WIDTH_MIN,
  clampIpynbSidebarWidth,
} from '../../../lib/ipynb/ipynbSidebarConstants';
import IpynbCellList from './IpynbCellList';
import IpynbNotebookSidebar from './IpynbNotebookSidebar';
import IpynbNotebookToolbar from './IpynbNotebookToolbar';
import './ipynb-notebook.css';

export interface IpynbNotebookViewHandle {
  getContent(): string;
}

interface IpynbNotebookViewProps {
  notebookKey: string;
  workspaceRoot: string | null;
  content: string;
  readOnly: boolean;
  keybindingMode: EditorMode;
  sourceFont: EditorFontSettings;
  onChange: (content: string) => void;
}

const IpynbNotebookView = forwardRef<
  IpynbNotebookViewHandle,
  IpynbNotebookViewProps
>(function IpynbNotebookView(
  {
    notebookKey,
    workspaceRoot,
    content,
    readOnly,
    keybindingMode,
    sourceFont,
    onChange,
  },
  ref,
) {
  const [doc, setDoc] = useState<IpynbDocument | null>(() => {
    try {
      return parseIpynbJson(content);
    } catch {
      return null;
    }
  });
  const [parseError, setParseError] = useState<string | null>(() => {
    try {
      parseIpynbJson(content);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : '无法解析 Notebook';
    }
  });
  const [kernels, setKernels] = useState<KernelSpec[]>([]);
  const [selectedSpecId, setSelectedSpecId] = useState<string | null>(null);
  const [kernelStatus, setKernelStatus] =
    useState<IpynbKernelStatus>('disconnected');
  const [kernelErrorMessage, setKernelErrorMessage] = useState<string | null>(
    null,
  );
  const [cellStatuses, setCellStatuses] = useState<
    Record<string, IpynbCellExecutionStatus>
  >({});
  const [cellSessionRunCounts, setCellSessionRunCounts] = useState<
    Record<string, number>
  >({});
  const [runningCellId, setRunningCellId] = useState<string | null>(null);
  const [memoryBytes, setMemoryBytes] = useState<number | null>(null);
  const [variables, setVariables] = useState<IpynbKernelVariable[]>([]);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(IPYNB_SIDEBAR_WIDTH_DEFAULT);

  const contentRef = useRef(content);
  const bodyRef = useRef<HTMLDivElement>(null);
  const sidebarShellRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string | null>(null);
  const docRef = useRef(doc);
  const runAllQueueRef = useRef<string[]>([]);
  const tabContextRef = useRef({ notebookKey });
  const liveOutputsRef = useRef<Record<string, IpynbOutput[]>>({});
  const liveOutputRafRef = useRef<number | null>(null);
  const inspectInFlightRef = useRef(false);
  const [liveOutputTick, setLiveOutputTick] = useState(0);

  docRef.current = doc;

  const scheduleLiveOutputRefresh = useCallback(() => {
    if (liveOutputRafRef.current !== null) return;
    liveOutputRafRef.current = requestAnimationFrame(() => {
      liveOutputRafRef.current = null;
      setLiveOutputTick((tick) => tick + 1);
    });
  }, []);

  const resetLiveOutputs = useCallback(
    (cellId: string) => {
      delete liveOutputsRef.current[cellId];
      scheduleLiveOutputRefresh();
    },
    [scheduleLiveOutputRefresh],
  );

  const handleSidebarWidthChange = useCallback((next: number) => {
    const containerWidth = bodyRef.current?.clientWidth ?? 0;
    setSidebarWidth(clampIpynbSidebarWidth(next, containerWidth));
  }, []);

  const resolveSidebarMax = useCallback(() => {
    const containerWidth = bodyRef.current?.clientWidth ?? 0;
    return clampIpynbSidebarWidth(IPYNB_SIDEBAR_WIDTH_MAX, containerWidth);
  }, []);

  const { dragging: resizingSidebar, handleProps: sidebarResizeHandleProps } =
    useHorizontalDragSize({
      value: sidebarWidth,
      min: IPYNB_SIDEBAR_WIDTH_MIN,
      max: IPYNB_SIDEBAR_WIDTH_MAX,
      resolveMax: resolveSidebarMax,
      onChange: handleSidebarWidthChange,
      liveTargetRef: sidebarShellRef,
      invertDelta: true,
      ariaLabel: '调整变量面板宽度',
    });

  useEffect(() => {
    const container = bodyRef.current;
    if (!container) return undefined;

    let frameId: number | null = null;
    const syncWidth = () => {
      if (frameId !== null) cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        frameId = null;
        setSidebarWidth((current) =>
          clampIpynbSidebarWidth(current, container.clientWidth),
        );
      });
    };

    const observer = new ResizeObserver(syncWidth);
    observer.observe(container);
    return () => {
      observer.disconnect();
      if (frameId !== null) cancelAnimationFrame(frameId);
    };
  }, []);

  useImperativeHandle(ref, () => ({
    getContent: () => (doc ? serializeIpynbContent(doc) : contentRef.current),
  }));

  useEffect(() => {
    void listIpynbKernels().then(setKernels);
  }, []);

  useEffect(() => {
    if (content === contentRef.current) return;
    contentRef.current = content;
    try {
      setDoc(parseIpynbJson(content));
      setParseError(null);
    } catch (e) {
      setDoc(null);
      setParseError(e instanceof Error ? e.message : '无法解析 Notebook');
    }
  }, [content]);

  const commitDoc = useCallback(
    (next: IpynbDocument) => {
      docRef.current = next;
      setDoc(next);
      const serialized = serializeIpynbContent(next);
      contentRef.current = serialized;
      onChange(serialized);
    },
    [onChange],
  );

  const connectJupyterServer = useCallback(
    async (args: {
      serverUrl: string;
      kernel: JupyterServerKernelInfo;
    }) => {
      setSelectedSpecId(args.kernel.specId);
      setKernelStatus('connecting');
      setKernelErrorMessage(null);
      setMemoryBytes(null);
      setVariables([]);
      if (sessionIdRef.current) {
        disposeIpynbKernel(sessionIdRef.current);
        sessionIdRef.current = null;
      }
      const result = await startIpynbKernel({
        notebookKey,
        cwd: workspaceRoot ?? undefined,
        jupyterServer: {
          serverUrl: args.serverUrl,
          kernelId: args.kernel.id,
          kernelName: args.kernel.name,
        },
      });
      if ('error' in result) {
        setKernelStatus('error');
        setKernelErrorMessage(result.error);
        return;
      }
      sessionIdRef.current = result.sessionId;
      setKernels((prev) => {
        if (prev.some((kernel) => kernel.id === args.kernel.specId)) {
          return prev;
        }
        return [
          ...prev,
          {
            kind: 'jupyter-server',
            id: args.kernel.specId,
            displayName: args.kernel.displayName,
            language: 'python',
            serverUrl: args.serverUrl,
            kernelId: args.kernel.id,
            kernelName: args.kernel.name,
          },
        ];
      });
    },
    [notebookKey, workspaceRoot],
  );

  const connectKernel = useCallback(
    async (specId: string) => {
      const kernel = kernels.find((item) => item.id === specId);
      if (kernel && isJupyterServerKernelSpec(kernel)) {
        await connectJupyterServer({
          serverUrl: kernel.serverUrl,
          kernel: {
            id: kernel.kernelId,
            name: kernel.kernelName,
            displayName: kernel.displayName,
            specId: kernel.id,
          },
        });
        return;
      }
      setSelectedSpecId(specId);
      setKernelStatus('connecting');
      setKernelErrorMessage(null);
      setMemoryBytes(null);
      setVariables([]);
      if (sessionIdRef.current) {
        disposeIpynbKernel(sessionIdRef.current);
        sessionIdRef.current = null;
      }
      const result = await startIpynbKernel({
        notebookKey,
        specId,
        cwd: workspaceRoot ?? undefined,
      });
      if ('error' in result) {
        setKernelStatus('error');
        setKernelErrorMessage(result.error);
        return;
      }
      sessionIdRef.current = result.sessionId;
    },
    [connectJupyterServer, kernels, notebookKey, workspaceRoot],
  );

  useEffect(() => {
    const previous = tabContextRef.current;
    const next = { notebookKey };
    if (shouldDisposeIpynbKernelOnTabContextChange(previous, next)) {
      disposeIpynbKernelSessionRef({
        sessionIdRef,
        dispose: disposeIpynbKernel,
      });
      setKernelStatus('disconnected');
      setKernelErrorMessage(null);
      setSelectedSpecId(null);
      setMemoryBytes(null);
      setVariables([]);
    }
    tabContextRef.current = next;
  }, [notebookKey]);

  useEffect(() => {
    return () => {
      if (liveOutputRafRef.current !== null) {
        cancelAnimationFrame(liveOutputRafRef.current);
      }
      disposeIpynbKernelSessionRef({
        sessionIdRef,
        dispose: disposeIpynbKernel,
      });
    };
  }, []);

  const runNextInQueue = useCallback(() => {
    const sessionId = sessionIdRef.current;
    const currentDoc = docRef.current;
    if (!sessionId || !currentDoc) return;
    const nextId = runAllQueueRef.current.shift();
    if (!nextId) return;
    const cell = currentDoc.cells.find((c) => c.id === nextId);
    if (!cell || cell.cell_type !== 'code') {
      runNextInQueue();
      return;
    }
    setRunningCellId(nextId);
    resetLiveOutputs(nextId);
    const cleared = clearCellOutputs(currentDoc, nextId);
    commitDoc(cleared);
    executeIpynbCell({
      sessionId,
      cellId: nextId,
      source: cell.source,
    });
  }, [commitDoc, resetLiveOutputs]);

  const refreshKernelInspect = useCallback(async () => {
    const sessionId = sessionIdRef.current;
    if (!sessionId || inspectInFlightRef.current) return;
    inspectInFlightRef.current = true;
    setInspectLoading(true);
    try {
      const result = await inspectIpynbKernel(sessionId);
      if (result && sessionIdRef.current === sessionId) {
        setMemoryBytes(result.memoryBytes);
        setVariables(result.variables);
      }
    } finally {
      inspectInFlightRef.current = false;
      setInspectLoading(false);
    }
  }, []);

  useEffect(() => {
    if (kernelStatus !== 'idle') return undefined;
    const sessionId = sessionIdRef.current;
    if (!sessionId) return undefined;
    const kernel = kernels.find((item) => item.id === selectedSpecId) ?? null;
    if (kernel && isJupyterServerKernelSpec(kernel)) {
      return undefined;
    }
    void refreshKernelInspect();
    const timer = window.setInterval(() => {
      void refreshKernelInspect();
    }, 3000);
    return () => {
      window.clearInterval(timer);
    };
  }, [kernelStatus, kernels, refreshKernelInspect, selectedSpecId]);

  useEffect(() => {
    return subscribeIpynbKernelEvents({
      onKernelStatus: (payload) => {
        if (payload.sessionId !== sessionIdRef.current) return;
        setKernelStatus(payload.status);
        if (payload.status === 'idle' || payload.status === 'busy') {
          setKernelErrorMessage(null);
        } else if (payload.error) {
          setKernelErrorMessage(payload.error);
        }
      },
      onCellStatus: (payload) => {
        if (payload.sessionId !== sessionIdRef.current) return;
        setCellStatuses((prev) => ({
          ...prev,
          [payload.cellId]: payload.status,
        }));
        if (payload.status === 'running') {
          setRunningCellId(payload.cellId);
        }
      },
      onCellOutput: (payload) => {
        if (payload.sessionId !== sessionIdRef.current) return;
        const prev = liveOutputsRef.current[payload.cellId] ?? [];
        liveOutputsRef.current[payload.cellId] = appendOutputToList(
          prev,
          payload.output,
        );
        scheduleLiveOutputRefresh();
      },
      onCellExecuteReply: (payload) => {
        if (payload.sessionId !== sessionIdRef.current) return;
        const currentDoc = docRef.current;
        if (!currentDoc) return;
        const live = liveOutputsRef.current[payload.cellId] ?? [];
        delete liveOutputsRef.current[payload.cellId];
        const next = finalizeCellExecution(
          currentDoc,
          payload.cellId,
          payload.executionCount,
          payload.outputs,
          live,
        );
        commitDoc(next);
        scheduleLiveOutputRefresh();
        setCellStatuses((prev) => ({
          ...prev,
          [payload.cellId]: payload.status === 'ok' ? 'success' : 'error',
        }));
        setCellSessionRunCounts((prev) => ({
          ...prev,
          [payload.cellId]: nextIpynbCellSessionRunCount(prev[payload.cellId] ?? 0),
        }));
        if (runAllQueueRef.current.length > 0) {
          runNextInQueue();
        } else {
          setRunningCellId((current) =>
            current === payload.cellId ? null : current,
          );
          if (payload.status === 'ok') {
            void refreshKernelInspect();
          }
        }
      },
    });
  }, [commitDoc, refreshKernelInspect, runNextInQueue, scheduleLiveOutputRefresh]);

  const handleRunCell = useCallback(
    (cellId: string) => {
      const sessionId = sessionIdRef.current;
      const currentDoc = doc;
      if (!sessionId || !currentDoc || readOnly) return;
      const cell = currentDoc.cells.find((c) => c.id === cellId);
      if (!cell || cell.cell_type !== 'code') return;
      runAllQueueRef.current = [];
      setRunningCellId(cellId);
      resetLiveOutputs(cellId);
      commitDoc(clearCellOutputs(currentDoc, cellId));
      executeIpynbCell({ sessionId, cellId, source: cell.source });
    },
    [commitDoc, doc, readOnly, resetLiveOutputs],
  );

  const handleRunAll = useCallback(() => {
    if (!doc || readOnly || !sessionIdRef.current) return;
    runAllQueueRef.current = doc.cells
      .filter((c) => c.cell_type === 'code' && c.id)
      .map((c) => c.id as string);
    if (runAllQueueRef.current.length === 0) return;
    runNextInQueue();
  }, [doc, readOnly, runNextInQueue]);

  const handleAddCell = useCallback(
    (type: IpynbCellType) => {
      if (!doc) return;
      const afterIndex = doc.cells.length - 1;
      commitDoc(addCell(doc, afterIndex, type));
    },
    [commitDoc, doc],
  );

  const handleUpdateSource = useCallback(
    (cellId: string, source: string) => {
      if (!doc) return;
      commitDoc(updateCellSource(doc, cellId, source));
    },
    [commitDoc, doc],
  );

  const handleMoveCell = useCallback(
    (cellId: string, direction: 'up' | 'down') => {
      if (!doc) return;
      commitDoc(moveCell(doc, cellId, direction));
    },
    [commitDoc, doc],
  );

  const handleDeleteCell = useCallback(
    (cellId: string) => {
      if (!doc) return;
      commitDoc(deleteCell(doc, cellId));
    },
    [commitDoc, doc],
  );

  const handleChangeCellType = useCallback(
    (cellId: string, type: IpynbCellType) => {
      if (!doc) return;
      commitDoc(changeCellType(doc, cellId, type));
    },
    [commitDoc, doc],
  );

  const handleFocusNextCell = useCallback((index: number) => {
    const container = scrollRef.current;
    if (!container) return;
    const cells = container.querySelectorAll<HTMLElement>('.IpynbCell');
    const next = cells[index + 1];
    if (!next) return;
    next.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    const editor = next.querySelector<HTMLElement>('.cm-content');
    editor?.focus();
  }, []);

  const kernelConnected =
    kernelStatus === 'idle' ||
    kernelStatus === 'busy' ||
    kernelStatus === 'error';

  const selectedKernel =
    kernels.find((kernel) => kernel.id === selectedSpecId) ?? null;

  if (parseError || !doc) {
    return (
      <div className="IpynbNotebookView" style={sourceEditorFontVars(sourceFont)}>
        <p className="IpynbNotebookView__error" role="alert">
          {parseError}
        </p>
      </div>
    );
  }

  return (
    <div
      className="IpynbNotebookView"
      style={sourceEditorFontVars(sourceFont)}
    >
      <IpynbNotebookToolbar
        readOnly={readOnly}
        kernels={kernels}
        selectedSpecId={selectedSpecId}
        kernelStatus={kernelStatus}
        kernelErrorMessage={kernelErrorMessage}
        runningCellId={runningCellId}
        onSelectKernel={(specId) => {
          void connectKernel(specId);
        }}
        onConnectJupyterServer={(args) => {
          void connectJupyterServer(args);
        }}
        onRestartKernel={() => {
          const sessionId = sessionIdRef.current;
          if (!sessionId) return;
          setMemoryBytes(null);
          setVariables([]);
          void restartIpynbKernel(sessionId, workspaceRoot ?? undefined).then(
            (nextId) => {
              if (nextId) {
                sessionIdRef.current = nextId;
                setKernelStatus('connecting');
              }
            },
          );
        }}
        onInterrupt={() => {
          const sessionId = sessionIdRef.current;
          if (sessionId) {
            interruptIpynbKernel(sessionId);
          }
        }}
        onRunAll={handleRunAll}
        onAddCell={handleAddCell}
      />
      <div
        ref={bodyRef}
        className={`IpynbNotebookView__body${resizingSidebar ? ' IpynbNotebookView__body--resizing' : ''}`}
      >
        <div ref={scrollRef} className="IpynbNotebookView__main">
          <div className="IpynbNotebookView__inner">
            <IpynbCellList
              doc={doc}
              keybindingMode={keybindingMode}
              readOnly={readOnly}
              kernelConnected={kernelConnected}
              cellStatuses={cellStatuses}
              cellSessionRunCounts={cellSessionRunCounts}
              liveOutputsByCellId={liveOutputsRef.current}
              liveOutputTick={liveOutputTick}
              onUpdateSource={handleUpdateSource}
              onRunCell={handleRunCell}
              onMoveCell={handleMoveCell}
              onDeleteCell={handleDeleteCell}
              onChangeCellType={handleChangeCellType}
              onFocusNextCell={handleFocusNextCell}
            />
          </div>
        </div>
        <div
          className={`IpynbNotebookView__resize${resizingSidebar ? ' IpynbNotebookView__resize--active' : ''}`}
          {...sidebarResizeHandleProps}
        />
        <div
          ref={sidebarShellRef}
          className="IpynbNotebookSidebar__shell"
          style={{ width: sidebarWidth }}
        >
          <IpynbNotebookSidebar
            kernelStatus={kernelStatus}
            kernelErrorMessage={kernelErrorMessage}
            selectedKernel={selectedKernel}
            memoryBytes={memoryBytes}
            variables={variables}
            inspectLoading={inspectLoading}
            kernelConnected={kernelConnected}
            onRefresh={() => {
              void refreshKernelInspect();
            }}
          />
        </div>
      </div>
    </div>
  );
});

export default IpynbNotebookView;
