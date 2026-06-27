import { EditorSelection, EditorState } from '@codemirror/state';
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
  applyEditorHighlight,
  applyEditorReveal,
  buildEditorRevealExtension,
  clearEditorHighlight,
  type EditorRevealRequest,
} from '../../lib/editorReveal';
import languageExtensionForId from '../../lib/codemirrorLanguage';
import schemeStructuredEditing from '../../lib/scheme/schemeVimCoexist';
import { buildCommonSourceUiExtensions } from '../../lib/codemirrorSetup';
import { useSourceEditorTheme } from '../../hooks/useAppTheme';
import { useEditorIndentSettings } from '../../hooks/useEditorIndentSettings';
import { useWheelScrollOnlyWhenGestureStartsIn } from '../../lib/wheelScrollOnlyWhenGestureStartsIn';
import { setActiveEditorSelection } from '../../lib/editorSelectionBridge';
import { getSourceLanguageId } from '../../lib/fileLanguage';

function clampDocPos(view: EditorView, pos: number): number {
  return Math.max(0, Math.min(pos, view.state.doc.length));
}

function resolvePosAtCoords(
  view: EditorView,
  clientX: number,
  clientY: number,
): number | null {
  const hit = view.posAtCoords({ x: clientX, y: clientY });
  if (hit == null || typeof hit.pos !== 'number' || Number.isNaN(hit.pos)) {
    return null;
  }
  return clampDocPos(view, hit.pos);
}

export interface SourceCodeEditorProps {
  tabId: string;
  tabKey: string;
  value: string;
  relativePath: string | null;
  keybindingMode: EditorMode;
  readOnly: boolean;
  reveal?: EditorRevealRequest | null;
  mnoteQuoteHighlight?: EditorRevealRequest | null;
  onRevealComplete?: () => void;
  onChange: (value: string) => void;
  onVisibleLineChange?: (line: number) => void;
  onContextMenu?: (event: MouseEvent) => void;
}

export interface SourceCodeEditorHandle {
  getValue: () => string;
  setDocument: (content: string) => void;
  focus: () => void;
  getSelectionText: () => string;
  getSelectionRange: () => { from: number; to: number } | null;
  getSelectionLines: () => { start: number; end: number };
  getCursorLine: () => number;
  getInsertPosition: () => number | null;
  getPositionAtCoords: (clientX: number, clientY: number) => number | null;
}

const SourceCodeEditor = forwardRef<
  SourceCodeEditorHandle,
  SourceCodeEditorProps
>(function SourceCodeEditor(
  {
    tabId,
    tabKey,
    value,
    relativePath,
    keybindingMode,
    readOnly,
    reveal,
    mnoteQuoteHighlight,
    onRevealComplete,
    onChange,
    onVisibleLineChange,
    onContextMenu,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  useWheelScrollOnlyWhenGestureStartsIn(containerRef);
  const viewRef = useRef<EditorView | null>(null);
  const contextMenuSelectionRef = useRef<{ from: number; to: number } | null>(
    null,
  );
  const revealRef = useRef(reveal);
  revealRef.current = reveal;
  const appliedRevealIdRef = useRef<string | null>(null);
  const onRevealCompleteRef = useRef(onRevealComplete);
  onRevealCompleteRef.current = onRevealComplete;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onVisibleLineChangeRef = useRef(onVisibleLineChange);
  onVisibleLineChangeRef.current = onVisibleLineChange;
  const onContextMenuRef = useRef(onContextMenu);
  onContextMenuRef.current = onContextMenu;

  const languageId = getSourceLanguageId(relativePath);
  const sourceTheme = useSourceEditorTheme();
  const indentSettings = useEditorIndentSettings();

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
    getSelectionLines: () => {
      const view = viewRef.current;
      if (!view) return { start: 1, end: 1 };
      const { from, to } = view.state.selection.main;
      const start = view.state.doc.lineAt(from).number;
      const end = view.state.doc.lineAt(to).number;
      return { start, end: Math.max(start, end) };
    },
    getCursorLine: () => {
      const view = viewRef.current;
      if (!view) return 1;
      const { from } = view.state.selection.main;
      return view.state.doc.lineAt(from).number;
    },
    getInsertPosition: () => {
      const view = viewRef.current;
      if (!view) return null;
      return view.state.selection.main.head;
    },
    getPositionAtCoords: (clientX: number, clientY: number) => {
      const view = viewRef.current;
      if (!view) return null;
      return resolvePosAtCoords(view, clientX, clientY);
    },
  }));

  const extensions = useMemo(() => {
    const lang = languageExtensionForId(languageId);
    return [
      ...buildSourceCodeMirrorExtensions(keybindingMode),
      ...buildEditorRevealExtension(),
      ...buildCommonSourceUiExtensions(sourceTheme, indentSettings),
      EditorView.lineWrapping,
      EditorView.domEventHandlers({
        scroll(_event, view) {
          const onLineChange = onVisibleLineChangeRef.current;
          if (!onLineChange) return false;
          // IntersectionObserver 触发的合成 scroll 事件没有 target，用 scrollDOM 更可靠
          const scrollTop = view.scrollDOM.scrollTop;
          const block = view.lineBlockAtHeight(scrollTop + 24);
          const line = view.state.doc.lineAt(block.from).number;
          onLineChange(line);
          return false;
        },
      }),
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
      ...(languageId === 'scheme'
        ? schemeStructuredEditing(keybindingMode)
        : []),
      ...(readOnly ? [EditorState.readOnly.of(true)] : []),
    ];
  }, [languageId, keybindingMode, readOnly, sourceTheme, indentSettings, tabId]);

  useEffect(() => {
    const parent = containerRef.current;
    if (!parent) return undefined;

    parent.innerHTML = '';
    const view = new EditorView({
      parent,
      state: EditorState.create({ doc: value, extensions }),
    });
    viewRef.current = view;
    const pendingReveal = revealRef.current;
    if (pendingReveal) {
      window.requestAnimationFrame(() => {
        const activeView = viewRef.current;
        if (activeView && revealRef.current?.id === pendingReveal.id) {
          applyEditorReveal(activeView, pendingReveal);
        }
      });
    }

    return () => {
      view.destroy();
      viewRef.current = null;
      setActiveEditorSelection(null);
    };
    // value 仅作挂载时初始文档；编辑中由 CodeMirror 持有，避免父级 onChange 导致重建
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabKey, extensions]);

  useEffect(() => {
    if (!reveal) {
      appliedRevealIdRef.current = null;
      return undefined;
    }
    if (appliedRevealIdRef.current === reveal.id) return undefined;
    appliedRevealIdRef.current = reveal.id;

    let cancelled = false;
    let attempts = 0;
    const tryApply = () => {
      if (cancelled || attempts > 12) return;
      attempts += 1;
      const view = viewRef.current;
      if (!view) {
        window.requestAnimationFrame(tryApply);
        return;
      }
      applyEditorReveal(view, reveal);
      onRevealCompleteRef.current?.();
    };
    tryApply();
    return () => {
      cancelled = true;
    };
  }, [reveal]);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const tryApply = () => {
      if (cancelled || attempts > 12) return;
      attempts += 1;
      const view = viewRef.current;
      if (!view) {
        window.requestAnimationFrame(tryApply);
        return;
      }
      if (!mnoteQuoteHighlight) {
        clearEditorHighlight(view);
        return;
      }
      applyEditorHighlight(view, mnoteQuoteHighlight);
    };
    tryApply();
    return () => {
      cancelled = true;
    };
  }, [mnoteQuoteHighlight]);

  // capture 阶段监听，避免 CodeMirror/Vim 在 contextmenu 前清掉选区
  useEffect(() => {
    const parent = containerRef.current;
    if (!parent) return undefined;

    const saveSelectionOnRightPointer = (event: PointerEvent) => {
      if (event.button !== 2) return;
      const view = viewRef.current;
      if (!view) return;
      const { from, to } = view.state.selection.main;
      contextMenuSelectionRef.current = from === to ? null : { from, to };
      // 阻止 CodeMirror/Vim 在 contextmenu 前移动光标或清选区
      event.stopPropagation();
    };

    const handleContextMenu = (event: MouseEvent) => {
      const onMenu = onContextMenuRef.current;
      if (!onMenu) return;

      const view = viewRef.current;
      if (view) {
        const saved = contextMenuSelectionRef.current;
        contextMenuSelectionRef.current = null;
        if (saved) {
          const { from, to } = view.state.selection.main;
          if (from === to) {
            const anchor = clampDocPos(view, saved.from);
            const head = clampDocPos(view, saved.to);
            view.dispatch({
              selection: EditorSelection.single(anchor, head),
            });
          }
        }
      }

      event.preventDefault();
      event.stopPropagation();
      onMenu(event);
    };

    parent.addEventListener('pointerdown', saveSelectionOnRightPointer, {
      capture: true,
    });
    parent.addEventListener('contextmenu', handleContextMenu, { capture: true });
    return () => {
      parent.removeEventListener('pointerdown', saveSelectionOnRightPointer, {
        capture: true,
      });
      parent.removeEventListener('contextmenu', handleContextMenu, {
        capture: true,
      });
    };
  }, [tabKey]);

  return (
    <div className="MuledSourceEditor">
      <div ref={containerRef} className="MuledSourceEditor__cm" />
    </div>
  );
});

export default SourceCodeEditor;
