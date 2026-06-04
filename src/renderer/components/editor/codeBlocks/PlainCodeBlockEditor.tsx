import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import {
  type CodeBlockEditorProps,
  useCodeBlockEditorContext,
} from '@mdxeditor/editor';
import { useEffect, useMemo, useRef } from 'react';
import { useWysiwygTheme } from '../../../hooks/useWysiwygStyles';
import {
  codeBlockLanguageId,
  codeBlockLanguageLabel,
} from '../../../lib/fileLanguage';
import { buildWysiwygCodeBlockExtensions } from '../../../lib/wysiwygCodeMirrorSetup';
import useCodeBlockFocus from './useCodeBlockFocus';

/** CodeMirror 代码块：每块一个实例，语法高亮、无内部滚动条 */
export default function PlainCodeBlockEditor({
  code,
  language,
  focusEmitter,
}: CodeBlockEditorProps) {
  const { setCode } = useCodeBlockEditorContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(setCode);
  onChangeRef.current = setCode;
  const wysiwygTheme = useWysiwygTheme();

  const languageId = codeBlockLanguageId(language);

  useCodeBlockFocus(focusEmitter, viewRef);

  const extensions = useMemo(
    () => [
      ...buildWysiwygCodeBlockExtensions(languageId, wysiwygTheme),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChangeRef.current(update.state.doc.toString());
        }
      }),
    ],
    [languageId, wysiwygTheme],
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
    <div className="MuledPlainCodeBlock">
      <div ref={containerRef} className="MuledPlainCodeBlock__cm" />
      <div className="MuledPlainCodeBlock__label" aria-hidden="true">
        {codeBlockLanguageLabel(language)}
      </div>
    </div>
  );
}
