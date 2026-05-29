import type { Extension } from '@codemirror/state';
import { EditorSelection, EditorState, Prec } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { Vim, getCM, vim } from '@replit/codemirror-vim';
import type { EditorMode } from '../../shared/types/config';
import { requestOpenCommandPalette } from './commandPaletteBridge';

/** 文档变短后钳制选区，避免 Vim BlockCursor 在 coordsForChar 时 IndexSizeError */
function clampSelectionExtension(): Extension {
  return EditorState.transactionFilter.of((tr) => {
    if (!tr.docChanged) return tr;
    const len = tr.newDoc.length;
    const sel = tr.selection ?? tr.startState.selection;
    if (sel.ranges.every((r) => r.from <= len && r.to <= len)) {
      return tr;
    }
    const ranges = sel.ranges.map((r) =>
      EditorSelection.range(Math.min(r.anchor, len), Math.min(r.head, len)),
    );
    return [tr, { selection: EditorSelection.create(ranges, sel.mainIndex) }];
  });
}

/** Vim 测量阶段 DOM 与 doc 短暂不同步时的兜底 */
function suppressMeasureIndexSizeError(): Extension {
  return EditorView.exceptionSink.of((error) => {
    if (error instanceof DOMException && error.name === 'IndexSizeError') {
      return;
    }
    // eslint-disable-next-line no-console
    console.error(error);
  });
}

/** 部分 Vim 操作在 measure 前未走 transaction，用 microtask 再钳制一次 */
function clampSelectionAfterDocChange(): Extension {
  return EditorView.updateListener.of((update) => {
    if (!update.docChanged) return;
    const {
      doc: docBefore,
      selection: { main },
    } = update.state;
    const len = docBefore.length;
    if (main.from <= len && main.to <= len) return;
    queueMicrotask(() => {
      const { view } = update;
      if (!view.dom.isConnected) return;
      const { doc: docAfter, selection: selAfter } = view.state;
      const docLen = docAfter.length;
      const m = selAfter.main;
      if (m.from <= docLen && m.to <= docLen) return;
      view.dispatch({
        selection: {
          anchor: Math.min(m.anchor, docLen),
          head: Math.min(m.head, docLen),
        },
      });
    });
  });
}

const SOURCE_BASE_EXTENSIONS: Extension[] = [
  clampSelectionExtension(),
  clampSelectionAfterDocChange(),
  suppressMeasureIndexSizeError(),
];

function isVimInsertMode(view: EditorView): boolean {
  const cm = getCM(view);
  if (!cm) return false;
  // eslint-disable-next-line no-underscore-dangle -- @replit/codemirror-vim 公开 API
  const vimState = Vim.maybeInitVimState_(cm);
  return Boolean(vimState?.insertMode);
}

/** Normal 模式下 `:` 打开应用命令面板（替代 Vim 内置 ex 行） */
function vimCommandPaletteKeymap(): Extension {
  return Prec.highest(
    keymap.of([
      {
        key: ':',
        run(view) {
          if (isVimInsertMode(view)) return false;
          return requestOpenCommandPalette({ prefix: ':' });
        },
      },
    ]),
  );
}

/** diffSource 全文 Source 编辑器的 CodeMirror 扩展（含 Vim） */
export default function buildSourceCodeMirrorExtensions(
  keybindingMode: EditorMode,
): Extension[] {
  if (keybindingMode !== 'vim') {
    return SOURCE_BASE_EXTENSIONS;
  }
  return [...SOURCE_BASE_EXTENSIONS, vim(), vimCommandPaletteKeymap()];
}
