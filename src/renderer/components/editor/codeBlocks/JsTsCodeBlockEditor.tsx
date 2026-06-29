import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import {
  type CodeBlockEditorProps,
  useCodeBlockEditorContext,
} from '@mdxeditor/editor';
import { $setSelection } from 'lexical';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWysiwygTheme } from '../../../hooks/useWysiwygStyles';
import { useEditorIndentSettings } from '../../../hooks/useEditorIndentSettings';
import {
  codeBlockLanguageId,
  codeBlockLanguageLabel,
} from '../../../lib/fileLanguage';
import { buildWysiwygCodeBlockExtensions } from '../../../lib/wysiwygCodeMirrorSetup';
import { pushStatusToast } from '../../../lib/statusToast';
import {
  abortBunRun,
  executeBunRun,
  formatBunRunOutput,
} from '../../../lib/bun/bunRunClient';
import './PlainCodeBlockEditor.css';
import './JsTsCodeBlockEditor.css';

function PlayIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path d="M4 2.5v11l9-5.5-9-5.5z" fill="currentColor" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <rect x="4" y="4" width="8" height="8" rx="0.5" fill="currentColor" />
    </svg>
  );
}

/** WYSIWYG：```javascript / ```typescript 可运行代码块（Bun） */
export default function JsTsCodeBlockEditor({
  code,
  language,
  focusEmitter,
}: CodeBlockEditorProps) {
  const { setCode, parentEditor } = useCodeBlockEditorContext();
  const rootRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(setCode);
  onChangeRef.current = setCode;
  const wysiwygTheme = useWysiwygTheme();
  const indentSettings = useEditorIndentSettings();
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<{
    stdout: string;
    stderr: string;
    exitCode: number;
  } | null>(null);

  const languageId = codeBlockLanguageId(language);
  const languageLabel = codeBlockLanguageLabel(language);

  useEffect(() => {
    const unsub = focusEmitter.subscribe(() => {
      queueMicrotask(() => {
        viewRef.current?.focus();
      });
    });
    return unsub;
  }, [focusEmitter]);

  const extensions = useMemo(
    () => [
      ...buildWysiwygCodeBlockExtensions(languageId, wysiwygTheme, indentSettings),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChangeRef.current(update.state.doc.toString());
        }
      }),
      EditorView.domEventHandlers({
        focus: () => {
          parentEditor.update(() => {
            $setSelection(null);
          });
          return false;
        },
      }),
    ],
    [languageId, parentEditor, wysiwygTheme, indentSettings],
  );

  useEffect(() => {
    const parent = containerRef.current;
    if (!parent) return undefined;

    parent.innerHTML = '';
    const view = new EditorView({
      parent,
      state: EditorState.create({ doc: code, extensions }),
    });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // code 仅作挂载初始值；编辑中由 CodeMirror 持有
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wysiwygTheme, extensions]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current === code) return;
    view.dispatch({
      changes: { from: 0, to: current.length, insert: code },
    });
  }, [code]);

  const handleRun = useCallback(async () => {
    const source = viewRef.current?.state.doc.toString() ?? code;
    setRunning(true);
    setOutput(null);
    try {
      const result = await executeBunRun({ code: source, language });
      if (result) setOutput(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      pushStatusToast(`运行失败：${message}`, 'error');
    } finally {
      setRunning(false);
    }
  }, [code, language]);

  const handleAbort = useCallback(async () => {
    await abortBunRun();
  }, []);

  const combinedOutput = output ? formatBunRunOutput(output) : '';

  return (
    <div ref={rootRef} className="MuledPlainCodeBlock JsTsCodeBlockEditor">
      <div className="MuledPlainCodeBlock__header JsTsCodeBlockEditor__header">
        <span className="MuledPlainCodeBlock__headerHint">{languageLabel}</span>
        <div className="JsTsCodeBlockEditor__actions">
          {running ? (
            <button
              type="button"
              className="JsTsCodeBlockEditor__stopBtn"
              title="中断运行"
              aria-label="中断运行"
              onClick={() => {
                void handleAbort();
              }}
            >
              <StopIcon />
              <span>中断</span>
            </button>
          ) : null}
          <button
            type="button"
            className="JsTsCodeBlockEditor__runBtn"
            disabled={running}
            title="运行 (Bun)"
            aria-label="运行 JavaScript/TypeScript 代码"
            onClick={() => {
              void handleRun();
            }}
          >
            <PlayIcon />
            <span>{running ? '运行中…' : '运行'}</span>
          </button>
        </div>
      </div>
      <div ref={containerRef} className="MuledPlainCodeBlock__cm" />
      {output && (
        <div
          className={`JsTsCodeBlockEditor__output${
            output.exitCode !== 0
              ? ' JsTsCodeBlockEditor__output--error'
              : ''
          }`}
          aria-live="polite"
        >
          {combinedOutput || `(exit ${output.exitCode})`}
        </div>
      )}
    </div>
  );
}
