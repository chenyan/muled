import { StateEffect, StateField, type Extension } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView } from '@codemirror/view';

export interface EditorRevealRequest {
  id: string;
  line: number;
  column: number;
  length: number;
}

const setRevealHighlight = StateEffect.define<{
  from: number;
  to: number;
} | null>();

const revealHighlightField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(deco, tr) {
    let next = deco.map(tr.changes);
    for (const effect of tr.effects) {
      if (effect.is(setRevealHighlight)) {
        if (!effect.value) {
          next = Decoration.none;
        } else {
          next = Decoration.set([
            Decoration.mark({ class: 'cm-searchMatch' }).range(
              effect.value.from,
              effect.value.to,
            ),
          ]);
        }
      }
    }
    return next;
  },
  provide: (field) => EditorView.decorations.from(field),
});

export function buildEditorRevealExtension(): Extension[] {
  return [revealHighlightField];
}

export function applyEditorReveal(
  view: EditorView,
  request: EditorRevealRequest,
): boolean {
  const doc = view.state.doc;
  if (request.line < 1 || request.line > doc.lines) {
    return false;
  }

  const line = doc.line(request.line);
  const from = Math.min(line.from + request.column, line.to);
  const to = Math.min(from + request.length, line.to);
  if (from >= to) {
    return false;
  }

  view.dispatch({
    selection: { anchor: from, head: to },
    effects: [setRevealHighlight.of({ from, to })],
    scrollIntoView: true,
  });
  view.focus();
  return true;
}
