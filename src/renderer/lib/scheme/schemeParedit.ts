import type { Extension } from '@codemirror/state';
import { Prec } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import type { EditorView } from '@codemirror/view';
import {
  backwardBarf,
  backwardSlurp,
  forwardBarf,
  forwardSlurp,
  killSexp,
  moveToSexpBoundary,
  raiseSexp,
  spliceSexp,
} from './sexpOps';
import type { SchemeStructuredEditingPolicy } from './schemeVimCoexist';

export interface SchemePareditOptions {
  policy?: SchemeStructuredEditingPolicy;
}

function runAtCursor(view: EditorView, fn: typeof forwardSlurp): boolean {
  const pos = view.state.selection.main.head;
  const spec = fn(view.state, pos);
  if (!spec) return false;
  view.dispatch(spec);
  return true;
}

const schemePareditKeymap = keymap.of([
  {
    key: 'Mod-Alt-f',
    run: (view) =>
      runAtCursor(view, (state, pos) =>
        moveToSexpBoundary(state, pos, 'forward'),
      ),
  },
  {
    key: 'Mod-Alt-b',
    run: (view) =>
      runAtCursor(view, (state, pos) =>
        moveToSexpBoundary(state, pos, 'backward'),
      ),
  },
  {
    key: 'Mod-Alt-ArrowRight',
    run: (view) => runAtCursor(view, forwardSlurp),
  },
  {
    key: 'Mod-Alt-ArrowLeft',
    run: (view) => runAtCursor(view, backwardSlurp),
  },
  {
    key: 'Mod-Alt-ArrowDown',
    run: (view) => runAtCursor(view, forwardBarf),
  },
  {
    key: 'Mod-Alt-ArrowUp',
    run: (view) => runAtCursor(view, backwardBarf),
  },
  {
    key: 'Mod-Alt-s',
    run: (view) => runAtCursor(view, spliceSexp),
  },
  {
    key: 'Mod-Alt-r',
    run: (view) => runAtCursor(view, raiseSexp),
  },
  {
    key: 'Mod-Alt-k',
    run: (view) => runAtCursor(view, killSexp),
  },
]);

export default function schemeParedit(_options?: SchemePareditOptions): Extension {
  // Mod-Alt 组合与 Vim Normal/Insert 默认键位不冲突，两种 policy 均注册
  return Prec.high(schemePareditKeymap);
}
