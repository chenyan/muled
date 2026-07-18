import { EditorState, Prec } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { useEffect, useRef } from 'react';
import type { EditorMode } from '../../../../shared/types/config';
import languageExtensionForId from '../../../lib/codemirrorLanguage';
import buildSourceCodeMirrorExtensions from '../../../lib/codemirrorExtensions';
import { buildCommonSourceUiExtensions } from '../../../lib/codemirrorSetup';
import { useEditorIndentSettings } from '../../../hooks/useEditorIndentSettings';

/** Notebook cell 固定浅色底，编辑器语法主题与之对齐 */
const IPYNB_CELL_EDITOR_THEME = 'light' as const;

interface IpynbCellEditorProps {
  cellKey: string;
  value: string;
  languageId: string;
  keybindingMode: EditorMode;
  readOnly: boolean;
  minLines?: number;
  onChange: (value: string) => void;
  onShiftEnter?: () => void;
}

export default function IpynbCellEditor({
  cellKey,
  value,
  languageId,
  keybindingMode,
  readOnly,
  minLines = 1,
  onChange,
  onShiftEnter,
}: IpynbCellEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onShiftEnterRef = useRef(onShiftEnter);
  const sourceTheme = IPYNB_CELL_EDITOR_THEME;
  const indentSettings = useEditorIndentSettings();
  onChangeRef.current = onChange;
  onShiftEnterRef.current = onShiftEnter;

  useEffect(() => {
    const parent = containerRef.current;
    if (!parent) return undefined;

    const lang = languageExtensionForId(languageId);
    const extensions = [
      ...(onShiftEnter
        ? [
            Prec.highest(
              keymap.of([
                {
                  key: 'Shift-Enter',
                  run: () => {
                    onShiftEnterRef.current?.();
                    return true;
                  },
                },
              ]),
            ),
            EditorView.domEventHandlers({
              keydown(event) {
                if (
                  event.key !== 'Enter' ||
                  !event.shiftKey ||
                  event.ctrlKey ||
                  event.metaKey ||
                  event.altKey
                ) {
                  return false;
                }
                event.preventDefault();
                onShiftEnterRef.current?.();
                return true;
              },
            }),
          ]
        : []),
      ...buildCommonSourceUiExtensions(sourceTheme, indentSettings),
      ...buildSourceCodeMirrorExtensions(keybindingMode),
      EditorView.lineWrapping,
      EditorView.theme({
        '&': { minHeight: `${minLines * 1.5}em` },
        '.cm-scroller': { overflow: 'auto' },
        '.cm-gutters': { display: 'none' },
      }),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChangeRef.current(update.state.doc.toString());
        }
      }),
      ...(lang ? [lang] : []),
      ...(readOnly ? [EditorState.readOnly.of(true)] : []),
    ];

    const view = new EditorView({
      parent,
      state: EditorState.create({ doc: value, extensions }),
    });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // cellKey 变化时重建编辑器
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    cellKey,
    languageId,
    keybindingMode,
    readOnly,
    sourceTheme,
    indentSettings,
    minLines,
  ]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
    }
  }, [value]);

  return (
    <div
      ref={containerRef}
      className="IpynbCellEditor"
      data-cell-key={cellKey}
    />
  );
}
