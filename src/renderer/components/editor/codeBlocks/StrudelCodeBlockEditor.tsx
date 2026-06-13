import {
  type CodeBlockEditorProps,
  useCodeBlockEditorContext,
} from '@mdxeditor/editor';
import { useCallback, useEffect, useRef, useState } from 'react';
import useCodeBlockInView from '../../../hooks/useCodeBlockInView';
import {
  disposeStrudelEditor,
  evaluateStrudelEditor,
  loadStrudelRepl,
  mountStrudelEditor,
  normalizeStrudelSource,
  readStrudelEditorCode,
  stopStrudelEditor,
  toggleStrudelEditor,
  waitForStrudelMirror,
  writeStrudelEditorCode,
  type StrudelEditorElement,
} from '../../../lib/strudelRepl';
import useCodeBlockFocus from './useCodeBlockFocus';
import './StrudelCodeBlockEditor.css';

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

/** WYSIWYG：```strudel 可播放代码块 */
export default function StrudelCodeBlockEditor({
  code,
  focusEmitter,
}: CodeBlockEditorProps) {
  const { setCode } = useCodeBlockEditorContext();
  const rootRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<StrudelEditorElement | null>(null);
  const codeRef = useRef(code);
  const syncingFromEditorRef = useRef(false);
  codeRef.current = code;
  const inView = useCodeBlockInView(rootRef);
  const [replReady, setReplReady] = useState(false);
  const [mirrorReady, setMirrorReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useCodeBlockFocus(focusEmitter, hostRef);

  useEffect(() => {
    if (!inView) {
      return undefined;
    }
    let cancelled = false;
    loadStrudelRepl()
      .then(() => {
        if (!cancelled) {
          setReplReady(true);
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
  }, [inView]);

  useEffect(() => {
    const host = hostRef.current;
    if (!inView || !replReady || !host) {
      return undefined;
    }

    let cancelled = false;
    const editor = mountStrudelEditor(host, codeRef.current, { solo: false });
    editorRef.current = editor;
    setMirrorReady(false);

    void waitForStrudelMirror(editor).then((mounted) => {
      if (cancelled || mounted !== editorRef.current) {
        return;
      }
      writeStrudelEditorCode(mounted, codeRef.current);
      setMirrorReady(true);
    });

    return () => {
      cancelled = true;
      disposeStrudelEditor(editorRef.current);
      editorRef.current = null;
      setMirrorReady(false);
      host.replaceChildren();
    };
  }, [inView, replReady]);

  useEffect(() => {
    if (!editorRef.current || !mirrorReady || syncingFromEditorRef.current) {
      return;
    }
    const current = readStrudelEditorCode(editorRef.current);
    const normalized = normalizeStrudelSource(code);
    if (current !== normalized) {
      writeStrudelEditorCode(editorRef.current, normalized);
    }
  }, [code, mirrorReady]);

  const commitEditorCode = useCallback(() => {
    const next = readStrudelEditorCode(editorRef.current);
    if (next === null || next === codeRef.current) {
      return;
    }
    codeRef.current = next;
    syncingFromEditorRef.current = true;
    setCode(next);
    queueMicrotask(() => {
      syncingFromEditorRef.current = false;
    });
  }, [setCode]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !mirrorReady) {
      return undefined;
    }

    const syncEvents = ['input', 'keyup', 'focusout'] as const;
    const handler = () => commitEditorCode();
    for (const eventName of syncEvents) {
      host.addEventListener(eventName, handler);
    }
    return () => {
      for (const eventName of syncEvents) {
        host.removeEventListener(eventName, handler);
      }
    };
  }, [commitEditorCode, mirrorReady]);

  const handlePlay = useCallback(async () => {
    commitEditorCode();
    await evaluateStrudelEditor(editorRef.current, true);
  }, [commitEditorCode]);

  const handleStop = useCallback(async () => {
    await stopStrudelEditor(editorRef.current);
  }, []);

  const handleToggle = useCallback(async () => {
    commitEditorCode();
    await toggleStrudelEditor(editorRef.current);
  }, [commitEditorCode]);

  if (loadError) {
    return (
      <div
        ref={rootRef}
        className="StrudelCodeBlockEditor StrudelCodeBlockEditor--error"
        role="alert"
      >
        无法加载 Strudel：{loadError}
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className="StrudelCodeBlockEditor MuledCodeBlockWithPreview MuledCodeBlockWithPreview--strudel"
      role="group"
      aria-label="Strudel 代码块"
      aria-busy={inView && !mirrorReady}
    >
      <div
        className="StrudelCodeBlockEditor__toolbar"
        role="toolbar"
        aria-label="Strudel 播放控制"
      >
        <span className="StrudelCodeBlockEditor__label">Strudel</span>
        <div className="StrudelCodeBlockEditor__actions">
          <button
            type="button"
            className="StrudelCodeBlockEditor__iconBtn StrudelCodeBlockEditor__iconBtn--play"
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
            className="StrudelCodeBlockEditor__iconBtn"
            disabled={!mirrorReady}
            title="停止 (Alt+.)"
            aria-label="停止"
            onClick={() => {
              void handleStop();
            }}
          >
            <StopIcon />
          </button>
          <button
            type="button"
            className="StrudelCodeBlockEditor__iconBtn"
            disabled={!mirrorReady}
            title="切换播放/停止"
            aria-label="切换播放/停止"
            onClick={() => {
              void handleToggle();
            }}
          >
            <ToggleIcon />
          </button>
        </div>
        <span className="StrudelCodeBlockEditor__hint">Ctrl+Enter 更新</span>
      </div>
      {!inView && code.trim() && (
        <p className="MuledCodeBlockWithPreview__placeholder">
          Strudel 代码块（滚动到可见区域后加载）
        </p>
      )}
      <div
        ref={hostRef}
        className="StrudelCodeBlockEditor__host"
        tabIndex={-1}
        hidden={!inView}
      />
    </div>
  );
}
