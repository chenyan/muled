import type { Extension } from '@codemirror/state';
import { Prec } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import type { EditorView } from '@codemirror/view';
import { isVimInsertMode } from '../vimInsertMode';
import { contractSelection, expandSelection } from './sexpOps';
import type { SchemeStructuredEditingPolicy } from './schemeVimCoexist';

export interface SchemeSemanticSelectionOptions {
  policy?: SchemeStructuredEditingPolicy;
}

function runSelection(view: EditorView, fn: typeof expandSelection): boolean {
  const spec = fn(view.state);
  if (!spec) return false;
  view.dispatch(spec);
  return true;
}

function allowAltArrow(
  view: EditorView,
  policy: SchemeStructuredEditingPolicy,
): boolean {
  if (policy === 'paredit') return true;
  return isVimInsertMode(view);
}

function buildSemanticSelectionKeymap(policy: SchemeStructuredEditingPolicy) {
  return keymap.of([
    {
      key: 'Alt-ArrowUp',
      run: (view) =>
        allowAltArrow(view, policy) && runSelection(view, expandSelection),
    },
    {
      key: 'Mod-Alt-.',
      run: (view) => runSelection(view, expandSelection),
    },
    {
      key: 'Alt-ArrowDown',
      run: (view) =>
        allowAltArrow(view, policy) && runSelection(view, contractSelection),
    },
    {
      key: 'Mod-Alt-,',
      run: (view) => runSelection(view, contractSelection),
    },
  ]);
}

export default function schemeSemanticSelection(
  options?: SchemeSemanticSelectionOptions,
): Extension {
  const policy = options?.policy ?? 'paredit';
  return Prec.high(buildSemanticSelectionKeymap(policy));
}
