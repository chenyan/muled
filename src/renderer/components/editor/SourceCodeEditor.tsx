import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import type { EditorMode } from '../../../shared/types/config';
import buildSourceCodeMirrorExtensions from '../../lib/codemirrorExtensions';
import {
  applyEditorReveal,
  buildEditorRevealExtension,
  type EditorRevealRequest,
} from '../../lib/editorReveal';
import languageExtensionForId from '../../lib/codemirrorLanguage';
import { buildCommonSourceUiExtensions } from '../../lib/codemirrorSetup';
import { useSourceEditorTheme } from '../../hooks/useAppTheme';
import { setActiveEditorSelection } from '../../lib/editorSelectionBridge';
import {
  getSourceLanguageId,
  getSourceLanguageLabel,
} from '../../lib/fileLanguage';

export interface SourceCodeEditorProps {
  tabId: string;
  tabKey: string;
  value: string;
  relativePath: string | null;
  keybindingMode: EditorMode;
  readOnly: boolean;
  reveal?: EditorRevealRequest | null;
  onChange: (value: string) => void;
}

export interface SourceCodeEditorHandle {
  getValue: () => string;
  setDocument: (content: string) => void;
  focus: () => void;
  getSelectionText: () => string;
  getSelectionRange: () => { from: number; to: number } | null;
}

const SourceCodeEditor = forwardRef<
  SourceCodeEditorHandle,
  SourceCodeEditorProps
>(function SourceCodeEditor(
  { tabId, tabKey, value, relativePath, keybindingMode, readOnly, reveal, onChange },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const languageId = getSourceLanguageId(relativePath);
  const languageLabel = getSourceLanguageLabel(languageId);
  const sourceTheme = useSourceEditorTheme();

  useImperativeHandle(ref, () => ({
    getValue: () => viewRef.current?.state.doc.toString() ?? value,
    setDocument: (next: string) => {
      const view = viewRef.current;
      if (!view) {
        onChangeRef.current(next);
        return;
      }
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: next,
        },
      });
      onChangeRef.current(next);
    },
    focus: () => {
      viewRef.current?.focus();
    },
    getSelectionText: () => {
      const view = viewRef.current;
      if (!view) return '';
      const { from, to } = view.state.selection.main;
      if (from === to) return '';
      return view.state.sliceDoc(from, to);
    },
    getSelectionRange: () => {
      const view = viewRef.current;
      if (!view) return null;
      const { from, to } = view.state.selection.main;
      if (from === to) return null;
      return { from, to };
    },
  }));

  const extensions = useMemo(() => {
    const lang = languageExtensionForId(languageId);
    return [
      ...buildSourceCodeMirrorExtensions(keybindingMode),
      ...buildEditorRevealExtension(),
      ...buildCommonSourceUiExtensions(sourceTheme),
      EditorView.lineWrapping,
      EditorView.updateListener.of((update) => {
        const { state, docChanged } = update;
        if (docChanged) {
          onChangeRef.current(state.doc.toString());
        }
        if (update.focusChanged && update.view.hasFocus) {
          const { from, to } = state.selection.main;
          setActiveEditorSelection({ tabId, from, to });
        } else if (update.selectionSet && update.view.hasFocus) {
          const { from, to } = state.selection.main;
          setActiveEditorSelection({ tabId, from, to });
        }
      }),
      ...(lang ? [lang] : []),
      ...(readOnly ? [EditorState.readOnly.of(true)] : []),
    ];
  }, [languageId, keybindingMode, readOnly, tabId, sourceTheme]);

  useEffect(() => {
    const parent = containerRef.current;
    if (!parent) return undefined;

    parent.innerHTML = '';
    const view = new EditorView({
      parent,
      state: EditorState.create({ doc: value, extensions }),
    });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
      setActiveEditorSelection(null);
    };
    // value 仅作挂载时初始文档；编辑中由 CodeMirror 持有，避免父级 onChange 导致重建
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabKey, extensions]);

  useEffect(() => {
    if (!reveal) return undefined;
    const view = viewRef.current;
    if (!view) return undefined;
    const id = window.requestAnimationFrame(() => {
      applyEditorReveal(view, reveal);
    });
    return () => window.cancelAnimationFrame(id);
  }, [reveal]);

  return (
    <div className="MuledSourceEditor">
      <div className="MuledSourceEditor__lang" aria-hidden>
        {languageLabel}
      </div>
      <div ref={containerRef} className="MuledSourceEditor__cm" />
    </div>
  );
});

export default SourceCodeEditor;
