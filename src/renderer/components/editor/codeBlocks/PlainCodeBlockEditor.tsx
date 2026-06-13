import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import {
  type CodeBlockEditorProps,
  useCodeBlockEditorContext,
} from '@mdxeditor/editor';
import { $setSelection } from 'lexical';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useWysiwygTheme } from '../../../hooks/useWysiwygStyles';
import { codeBlockLanguageId } from '../../../lib/fileLanguage';
import { buildWysiwygCodeBlockExtensions } from '../../../lib/wysiwygCodeMirrorSetup';
import CodeBlockLanguageInput from './CodeBlockLanguageInput';
import './PlainCodeBlockEditor.css';

function isLanguageHeaderTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(target.closest('.MuledPlainCodeBlock__header'))
  );
}

/** CodeMirror 代码块：每块一个实例，语法高亮、无内部滚动条 */
export default function PlainCodeBlockEditor({
  code,
  language,
  focusEmitter,
}: CodeBlockEditorProps) {
  const { setCode, setLanguage, parentEditor } = useCodeBlockEditorContext();
  const rootRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const languageInputRef = useRef<HTMLInputElement>(null);
  const languageEditingRef = useRef(false);
  const lastPointerTargetRef = useRef<EventTarget | null>(null);
  const onChangeRef = useRef(setCode);
  onChangeRef.current = setCode;
  const wysiwygTheme = useWysiwygTheme();

  const languageId = codeBlockLanguageId(language);

  const handleLanguageEditingChange = useCallback(
    (editing: boolean) => {
      languageEditingRef.current = editing;
      if (editing) {
        parentEditor.update(() => {
          $setSelection(null);
        });
      }
    },
    [parentEditor],
  );

  const focusLanguageInput = useCallback(() => {
    languageEditingRef.current = true;
    parentEditor.update(() => {
      $setSelection(null);
    });
    languageInputRef.current?.focus();
  }, [parentEditor]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return undefined;
    }

    const onPointerDownCapture = (event: PointerEvent) => {
      lastPointerTargetRef.current = event.target;
      if (!isLanguageHeaderTarget(event.target)) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      focusLanguageInput();
    };

    root.addEventListener('pointerdown', onPointerDownCapture, true);
    return () => {
      root.removeEventListener('pointerdown', onPointerDownCapture, true);
    };
  }, [focusLanguageInput]);

  useEffect(() => {
    const unsub = focusEmitter.subscribe(() => {
      queueMicrotask(() => {
        if (languageEditingRef.current) {
          return;
        }
        if (isLanguageHeaderTarget(lastPointerTargetRef.current)) {
          focusLanguageInput();
          return;
        }
        const input = languageInputRef.current;
        if (input && document.activeElement === input) {
          return;
        }
        viewRef.current?.focus();
      });
    });
    return unsub;
  }, [focusEmitter, focusLanguageInput]);

  const extensions = useMemo(
    () => [
      ...buildWysiwygCodeBlockExtensions(languageId, wysiwygTheme),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChangeRef.current(update.state.doc.toString());
        }
      }),
      EditorView.domEventHandlers({
        focus: () => {
          if (languageEditingRef.current) {
            return true;
          }
          parentEditor.update(() => {
            $setSelection(null);
          });
          return false;
        },
      }),
    ],
    [languageId, parentEditor, wysiwygTheme],
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
  }, [language, wysiwygTheme, extensions]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current === code) return;
    view.dispatch({
      changes: { from: 0, to: current.length, insert: code },
    });
  }, [code]);

  return (
    <div ref={rootRef} className="MuledPlainCodeBlock">
      <div className="MuledPlainCodeBlock__header">
        <span className="MuledPlainCodeBlock__headerHint">语言</span>
        <CodeBlockLanguageInput
          language={language}
          onLanguageChange={setLanguage}
          inputRef={languageInputRef}
          onEditingChange={handleLanguageEditingChange}
        />
      </div>
      <div ref={containerRef} className="MuledPlainCodeBlock__cm" />
    </div>
  );
}
