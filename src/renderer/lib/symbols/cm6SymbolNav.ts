import { syntaxTree } from '@codemirror/language';
import {
  Decoration,
  EditorView,
  hoverTooltip,
  keymap,
  type DecorationSet,
} from '@codemirror/view';
import {
  StateEffect,
  StateField,
  type EditorState,
  type Extension,
} from '@codemirror/state';
import { openTabSymbolIndex } from './openTabSymbolIndex';
import {
  requestOpenSymbolPicker,
  requestRevealSymbol,
} from './symbolNavBridge';
import type { SymbolDef } from './types';

const IDENT_NODE_NAMES = new Set([
  'VariableName',
  'PropertyName',
  'TypeName',
  'LabelName',
  'VariableDefinition',
  'PropertyDefinition',
  'TypeDefinition',
  'Identifier',
  'TypeIdentifier',
  'FieldIdentifier',
  'BoundIdentifier',
  'DefName',
  'Definition',
  'MethodName',
  'FieldName',
  'Symbol',
  'NamespaceIdentifier',
]);

export function identifierAt(
  state: EditorState,
  pos: number,
): { name: string; from: number; to: number } | null {
  const tree = syntaxTree(state);
  let node = tree.resolveInner(pos, -1);
  while (node) {
    if (IDENT_NODE_NAMES.has(node.name)) {
      const name = state.doc.sliceString(node.from, node.to);
      if (name && /^[\w$+\-*/=<>!?#:]+$/.test(name)) {
        return { name, from: node.from, to: node.to };
      }
    }
    if (!node.parent || node.parent.from === node.from) break;
    // Prefer leaf identity tokens; stop climbing past expression roots
    if (
      node.name === 'CallExpression' ||
      node.name === 'MemberExpression' ||
      node.name === 'Script' ||
      node.name === 'Program' ||
      node.name === 'SourceFile'
    ) {
      break;
    }
    node = node.parent;
  }
  return null;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function defTooltipDom(defs: SymbolDef[]): HTMLElement {
  const root = document.createElement('div');
  root.className = 'cm-symbol-def-tooltip';

  defs.slice(0, 8).forEach((def, index) => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'cm-symbol-def-tooltip__item';
    row.innerHTML = `<span class="cm-symbol-def-tooltip__kind">${escapeHtml(def.kind)}</span> <span class="cm-symbol-def-tooltip__name">${escapeHtml(def.name)}</span><br/><span class="cm-symbol-def-tooltip__loc">${escapeHtml(def.relativePath)}:${def.line}</span><br/><span class="cm-symbol-def-tooltip__preview">${escapeHtml(def.preview)}</span>`;
    row.addEventListener('mousedown', (event) => {
      event.preventDefault();
      requestRevealSymbol(def);
    });
    root.appendChild(row);
    if (index < Math.min(defs.length, 8) - 1) {
      const sep = document.createElement('div');
      sep.className = 'cm-symbol-def-tooltip__sep';
      root.appendChild(sep);
    }
  });

  if (defs.length > 8) {
    const more = document.createElement('div');
    more.className = 'cm-symbol-def-tooltip__more';
    more.textContent = `…及另外 ${defs.length - 8} 处定义`;
    root.appendChild(more);
  }

  return root;
}

function buildHoverTooltip(relativePath: string | null): Extension {
  return hoverTooltip(
    (view, pos) => {
      const ident = identifierAt(view.state, pos);
      if (!ident) return null;
      const defs = openTabSymbolIndex.findDefinitions(ident.name, relativePath);
      if (defs.length === 0) return null;
      return {
        pos: ident.from,
        end: ident.to,
        above: true,
        create() {
          return { dom: defTooltipDom(defs) };
        },
      };
    },
    { hoverTime: 400 },
  );
}

function isModClick(event: MouseEvent): boolean {
  return event.metaKey || event.ctrlKey;
}

const setJumpableSymbol = StateEffect.define<{
  from: number;
  to: number;
} | null>();

const jumpableSymbolField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(decorations, transaction) {
    let next = decorations.map(transaction.changes);
    transaction.effects.forEach((effect) => {
      if (effect.is(setJumpableSymbol)) {
        next = effect.value
          ? Decoration.set([
              Decoration.mark({ class: 'cm-jumpable-symbol' }).range(
                effect.value.from,
                effect.value.to,
              ),
            ])
          : Decoration.none;
      }
    });
    return next;
  },
  provide: (field) => EditorView.decorations.from(field),
});

function buildJumpableSymbolHover(relativePath: string | null): Extension {
  let lastPointer: { x: number; y: number } | null = null;
  let currentRange = '';

  const clear = (view: EditorView) => {
    if (!currentRange) return;
    currentRange = '';
    view.dispatch({ effects: setJumpableSymbol.of(null) });
  };

  const updateAtPointer = (
    view: EditorView,
    pointer: { x: number; y: number } | null,
    modifierDown: boolean,
  ) => {
    if (!modifierDown || !pointer) {
      clear(view);
      return;
    }
    const pos = view.posAtCoords(pointer);
    if (pos == null) {
      clear(view);
      return;
    }
    const ident = identifierAt(view.state, pos);
    if (
      !ident ||
      openTabSymbolIndex.findDefinitions(ident.name, relativePath).length === 0
    ) {
      clear(view);
      return;
    }
    const key = `${ident.from}:${ident.to}`;
    if (key === currentRange) return;
    currentRange = key;
    view.dispatch({
      effects: setJumpableSymbol.of({ from: ident.from, to: ident.to }),
    });
  };

  return EditorView.domEventHandlers({
    mousemove(event, view) {
      lastPointer = { x: event.clientX, y: event.clientY };
      updateAtPointer(view, lastPointer, isModClick(event));
      return false;
    },
    mouseleave(_event, view) {
      lastPointer = null;
      clear(view);
      return false;
    },
    keydown(event, view) {
      if (event.key === 'Meta' || event.key === 'Control') {
        updateAtPointer(view, lastPointer, true);
      }
      return false;
    },
    keyup(event, view) {
      if (event.key === 'Meta' || event.key === 'Control') {
        clear(view);
      }
      return false;
    },
    blur(_event, view) {
      clear(view);
      return false;
    },
  });
}

function buildModClickHandler(relativePath: string | null): Extension {
  return EditorView.domEventHandlers({
    click(event, view) {
      if (!isModClick(event) || event.button !== 0) return false;
      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
      if (pos == null) return false;
      const ident = identifierAt(view.state, pos);
      if (!ident) return false;
      event.preventDefault();
      const defs = openTabSymbolIndex.findDefinitions(ident.name, relativePath);
      if (defs.length === 0) return true;
      if (defs.length === 1) {
        requestRevealSymbol(defs[0]!);
        return true;
      }
      requestOpenSymbolPicker({
        mode: 'goto-definition',
        query: ident.name,
        preferPath: relativePath,
      });
      return true;
    },
  });
}

function buildSymbolKeymap(relativePath: string | null): Extension {
  return keymap.of([
    {
      key: 'Mod-Shift-o',
      run: () => {
        requestOpenSymbolPicker({ mode: 'goto-symbol' });
        return true;
      },
    },
    {
      key: 'Shift-F12',
      run: (view) => {
        const pos = view.state.selection.main.head;
        const ident = identifierAt(view.state, pos);
        if (!ident) {
          requestOpenSymbolPicker({ mode: 'references' });
          return true;
        }
        requestOpenSymbolPicker({
          mode: 'references',
          query: ident.name,
          preferPath: relativePath,
        });
        return true;
      },
    },
  ]);
}

const tooltipTheme = EditorView.baseTheme({
  '.cm-tooltip.cm-tooltip-hover': {
    border: '1px solid var(--muled-input-border, #e4e4e7)',
    background: 'var(--muled-surface, #fff)',
    color: 'var(--muled-fg, #18181b)',
    borderRadius: '8px',
    boxShadow: '0 8px 24px var(--muled-shadow, rgba(0,0,0,.12))',
    padding: '0',
    maxWidth: '420px',
  },
  '.cm-symbol-def-tooltip': {
    padding: '6px',
    fontSize: '12px',
    lineHeight: '1.4',
  },
  '.cm-symbol-def-tooltip__item': {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    border: 'none',
    background: 'transparent',
    color: 'inherit',
    cursor: 'pointer',
    padding: '6px 8px',
    borderRadius: '6px',
    font: 'inherit',
  },
  '.cm-symbol-def-tooltip__item:hover': {
    background: 'var(--muled-hover, rgba(0,0,0,.06))',
  },
  '.cm-symbol-def-tooltip__kind': {
    opacity: 0.65,
    textTransform: 'uppercase',
    fontSize: '10px',
    letterSpacing: '0.04em',
  },
  '.cm-symbol-def-tooltip__name': {
    fontWeight: 600,
  },
  '.cm-symbol-def-tooltip__loc': {
    opacity: 0.7,
  },
  '.cm-symbol-def-tooltip__preview': {
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    opacity: 0.85,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
  },
  '.cm-symbol-def-tooltip__sep': {
    height: '1px',
    background: 'var(--muled-input-border, #e4e4e7)',
    margin: '4px 0',
  },
  '.cm-symbol-def-tooltip__more': {
    padding: '4px 8px',
    opacity: 0.65,
  },
  '.cm-jumpable-symbol': {
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
    cursor: 'pointer',
  },
  '&.cm-focused .cm-content': {
    // keep default
  },
});

export function buildSymbolNavExtensions(
  relativePath: string | null,
): Extension[] {
  return [
    buildHoverTooltip(relativePath),
    jumpableSymbolField,
    buildJumpableSymbolHover(relativePath),
    buildModClickHandler(relativePath),
    buildSymbolKeymap(relativePath),
    tooltipTheme,
  ];
}
