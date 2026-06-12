import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  disposeStrudelEditor,
  getStrudelMirror,
  loadStrudelRepl,
  readStrudelEditorCode,
  writeStrudelEditorCode,
  type StrudelEditorElement,
} from '../../lib/strudelRepl';
import {
  defaultStrudelExportFileName,
  exportStrudelToWav,
  type StrudelExportOptions,
} from '../../lib/strudelExport';
import StrudelExportDialog from './StrudelExportDialog';
import type { EditorFontSettings } from '../../../shared/types/config';
import { sourceEditorFontVars } from '../../lib/editorFontStyle';
import type { EditorTab } from '../../types/tab';

export interface StrudelReplPreviewHandle {
  getCode: () => string | null;
}

interface StrudelReplPreviewProps {
  tab: EditorTab;
  sourceFont: EditorFontSettings;
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden>
      <path fill="currentColor" d="M4 3.5v9l9-4.5-9-4.5z" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden>
      <rect fill="currentColor" x="4" y="4" width="8" height="8" rx="0.5" />
    </svg>
  );
}

function ToggleIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden>
      <path fill="currentColor" d="M3.5 3.5v9l5.5-4.5-5.5-4.5zm6 0v9l5.5-4.5-5.5-4.5z" />
    </svg>
  );
}

function ExportIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 2.5v7M5.5 7 8 9.5 10.5 7M3.5 11.5h9"
      />
    </svg>
  );
}

function waitForStrudelMirror(
  element: StrudelEditorElement,
): Promise<StrudelEditorElement> {
  return new Promise((resolve) => {
    const check = () => {
      if (element.editor) {
        resolve(element);
        return;
      }
      requestAnimationFrame(check);
    };
    check();
  });
}

const StrudelReplPreview = forwardRef<
  StrudelReplPreviewHandle,
  StrudelReplPreviewProps
>(function StrudelReplPreview({ tab, sourceFont }, ref) {
  const hostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<StrudelEditorElement | null>(null);
  const contentRef = useRef(tab.content);
  contentRef.current = tab.content;
  const [ready, setReady] = useState(false);
  const [mirrorReady, setMirrorReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    getCode: () => {
      const editor = editorRef.current;
      if (!editor) {
        return null;
      }
      return readStrudelEditorCode(editor);
    },
  }));

  useEffect(() => {
    let cancelled = false;
    loadStrudelRepl()
      .then(() => {
        if (!cancelled) {
          setReady(true);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : String(error);
          setLoadError(message);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!ready || !host) {
      return undefined;
    }

    let cancelled = false;
    host.replaceChildren();
    const editor = document.createElement('strudel-editor') as StrudelEditorElement;
    editor.setAttribute('code', contentRef.current);
    host.appendChild(editor);
    editorRef.current = editor;
    setMirrorReady(false);

    void waitForStrudelMirror(editor).then((mounted) => {
      if (cancelled || mounted !== editorRef.current) {
        return;
      }
      writeStrudelEditorCode(mounted, contentRef.current);
      setMirrorReady(true);
    });

    return () => {
      cancelled = true;
      disposeStrudelEditor(editorRef.current);
      editorRef.current = null;
      setMirrorReady(false);
      host.replaceChildren();
    };
  }, [ready, tab.relativePath]);

  useEffect(() => {
    if (!editorRef.current || !mirrorReady) {
      return;
    }
    writeStrudelEditorCode(editorRef.current, tab.content);
  }, [mirrorReady, tab.content]);

  const handlePlay = useCallback(async () => {
    const mirror = getStrudelMirror(editorRef.current);
    if (!mirror) {
      return;
    }
    await mirror.evaluate(true);
  }, []);

  const handleStop = useCallback(async () => {
    const mirror = getStrudelMirror(editorRef.current);
    if (!mirror) {
      return;
    }
    await mirror.stop();
  }, []);

  const handleToggle = useCallback(async () => {
    const mirror = getStrudelMirror(editorRef.current);
    if (!mirror) {
      return;
    }
    await mirror.toggle();
  }, []);

  const handleExport = useCallback(
    async (options: StrudelExportOptions) => {
      const code =
        readStrudelEditorCode(editorRef.current!) ??
        tab.content;
      setExportBusy(true);
      setExportError(null);
      try {
        await exportStrudelToWav(editorRef.current, code, options);
        setExportOpen(false);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        setExportError(message);
      } finally {
        setExportBusy(false);
      }
    },
    [tab.content],
  );

  if (loadError) {
    return (
      <div className="StrudelReplPreview StrudelReplPreview--error" role="alert">
        无法加载 Strudel REPL：{loadError}
      </div>
    );
  }

  return (
    <div
      className="StrudelReplPreview"
      style={sourceEditorFontVars(sourceFont)}
      aria-busy={!ready}
      aria-label="Strudel REPL"
    >
      <div className="StrudelReplPreview__toolbar" role="toolbar" aria-label="Strudel 播放控制">
        <div className="StrudelReplPreview__actions">
          <button
            type="button"
            className="StrudelReplPreview__iconBtn StrudelReplPreview__iconBtn--play"
            disabled={!mirrorReady}
            title="播放 (Ctrl+Enter)"
            aria-label="播放"
            onClick={() => {
              void handlePlay();
            }}
          >
            <PlayIcon />
          </button>
          <button
            type="button"
            className="StrudelReplPreview__iconBtn"
            disabled={!mirrorReady}
            title="停止"
            aria-label="停止"
            onClick={() => {
              void handleStop();
            }}
          >
            <StopIcon />
          </button>
          <button
            type="button"
            className="StrudelReplPreview__iconBtn"
            disabled={!mirrorReady}
            title="切换播放/停止"
            aria-label="切换播放/停止"
            onClick={() => {
              void handleToggle();
            }}
          >
            <ToggleIcon />
          </button>
          <button
            type="button"
            className="StrudelReplPreview__iconBtn"
            disabled={!mirrorReady || exportBusy}
            title="导出 WAV"
            aria-label="导出 WAV"
            aria-busy={exportBusy}
            onClick={() => {
              setExportError(null);
              setExportOpen(true);
            }}
          >
            <ExportIcon />
          </button>
        </div>
        <span className="StrudelReplPreview__hint">Ctrl+Enter 更新 · Alt+. 停止</span>
      </div>
      <div ref={hostRef} className="StrudelReplPreview__host" />
      <StrudelExportDialog
        open={exportOpen}
        busy={exportBusy}
        error={exportError}
        defaultFileName={defaultStrudelExportFileName(tab.relativePath)}
        onClose={() => {
          if (!exportBusy) {
            setExportOpen(false);
            setExportError(null);
          }
        }}
        onExport={(options) => {
          void handleExport(options);
        }}
      />
    </div>
  );
});

export default StrudelReplPreview;
