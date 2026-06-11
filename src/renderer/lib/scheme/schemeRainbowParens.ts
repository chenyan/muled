import { syntaxTree } from '@codemirror/language';
import type { Extension } from '@codemirror/state';
import { RangeSetBuilder } from '@codemirror/state';
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
} from '@codemirror/view';

import {
  isCollNodeName,
  SCHEME_COLL_DELIMS,
} from './schemeCollNodes';

const rainbowMarks = Array.from({ length: 7 }, (_, depth) =>
  Decoration.mark({ class: `scheme-rainbow-${depth}` }),
);

function decorateRainbowParens(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const marks: { from: number; to: number; value: Decoration }[] = [];
  let depth = 0;

  syntaxTree(view.state).iterate({
    enter(node) {
      const spec = SCHEME_COLL_DELIMS[node.name];
      if (!spec) return;

      const mark = rainbowMarks[depth % rainbowMarks.length]!;
      const openFrom = node.from;
      const openTo = openFrom + spec.openLen;
      const closeFrom = node.to - spec.closeLen;
      const closeTo = node.to;

      for (const { from, to } of view.visibleRanges) {
        if (openTo > from && openFrom < to) {
          marks.push({ from: openFrom, to: openTo, value: mark });
        }
        if (closeTo > from && closeFrom < to) {
          marks.push({ from: closeFrom, to: closeTo, value: mark });
        }
      }

      depth += 1;
    },
    leave(node) {
      if (isCollNodeName(node.name)) {
        depth -= 1;
      }
    },
  });

  marks.sort((a, b) => a.from - b.from || a.to - b.to);
  for (const mark of marks) {
    builder.add(mark.from, mark.to, mark.value);
  }
  return builder.finish();
}

class SchemeRainbowParensPlugin {
  decorations: DecorationSet;

  constructor(view: EditorView) {
    this.decorations = decorateRainbowParens(view);
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged) {
      this.decorations = decorateRainbowParens(update.view);
    }
  }
}

export default function schemeRainbowParens(): Extension {
  return ViewPlugin.fromClass(SchemeRainbowParensPlugin, {
    decorations: (plugin) => plugin.decorations,
  });
}
