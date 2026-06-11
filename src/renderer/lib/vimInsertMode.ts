import { Vim, getCM } from '@replit/codemirror-vim';
import type { EditorView } from '@codemirror/view';

/** 当前 CodeMirror 视图是否处于 Vim insert 模式 */
export function isVimInsertMode(view: EditorView): boolean {
  const cm = getCM(view);
  if (!cm) return false;
  // eslint-disable-next-line no-underscore-dangle -- @replit/codemirror-vim 公开 API
  const vimState = Vim.maybeInitVimState_(cm);
  return Boolean(vimState?.insertMode);
}

/** 当前视图是否挂载了 Vim 扩展 */
export function isVimActive(view: EditorView): boolean {
  return Boolean(getCM(view));
}
