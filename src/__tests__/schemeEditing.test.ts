import { getIndentation, IndentContext } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { schemeLanguageDefinition } from '../renderer/lib/scheme/schemeLanguage';
import { schemeIndentServiceExtension } from '../renderer/lib/scheme/schemeIndent';
import { schemeStructuredEditingPolicy } from '../renderer/lib/scheme/schemeVimCoexist';
import parseSchemeOutline from '../renderer/lib/scheme/schemeOutline';
import {
  backwardBarf,
  contractSelection,
  enclosingSexp,
  expandSelection,
  forwardBarf,
  forwardSlurp,
  raiseSexp,
  spliceSexp,
} from '../renderer/lib/scheme/sexpOps';

function schemeState(
  doc: string,
  selection?: { anchor: number; head?: number },
) {
  return EditorState.create({
    doc,
    selection,
    extensions: [schemeLanguageDefinition, schemeIndentServiceExtension],
  });
}

function apply(state: EditorState, spec: ReturnType<typeof forwardSlurp>) {
  if (!spec) return state;
  return state.update(spec).state;
}

describe('scheme sexpOps', () => {
  it('finds enclosing sexp from syntax tree', () => {
    const state = schemeState('(define x (+ 1 2))');
    const sexp = enclosingSexp(state, 11);
    expect(sexp).not.toBeNull();
    expect(state.doc.sliceString(sexp!.from, sexp!.to)).toBe('(+ 1 2)');
  });

  it('forward slurp pulls next sibling into inner list', () => {
    const state = schemeState('(foo (a b) c)', { anchor: 7 });
    const next = apply(state, forwardSlurp(state, 7));
    expect(next.doc.toString()).toBe('(foo (a b c))');
  });

  it('forward barf pushes last child out of list', () => {
    const state = schemeState('(a b c)', { anchor: 2 });
    const next = apply(state, forwardBarf(state, 2));
    expect(next.doc.toString()).toBe('(a b) c');
  });

  it('backward barf moves opening paren after first child', () => {
    const state = schemeState('(a b c)', { anchor: 2 });
    const next = apply(state, backwardBarf(state, 2));
    expect(next.doc.toString()).toBe('a (b c)');
  });

  it('splices and raises nested list', () => {
    const state = schemeState('(wrap (inner))', { anchor: 8 });
    const spliced = apply(state, spliceSexp(state, 8));
    expect(spliced.doc.toString()).toBe('(wrap inner)');
    const raised = apply(spliced, raiseSexp(spliced, 7));
    expect(raised.doc.toString()).toBe('(wrap inner)');
  });

  it('expands and contracts semantic selection', () => {
    const state = schemeState('(define x (+ 1 2))', { anchor: 14 });
    const expanded = apply(state, expandSelection(state));
    expect(expanded.selection.main.from).toBeLessThan(
      expanded.selection.main.to,
    );
    const contracted = apply(expanded, contractSelection(expanded));
    expect(contracted.selection.main.from).toBe(contracted.selection.main.to);
  });
});

describe('scheme indent', () => {
  function indentCol(doc: string, pos = doc.length) {
    const state = schemeState(doc, { anchor: pos });
    return getIndentation(state, pos);
  }

  it('indents define body one unit below head', () => {
    const doc = '(define x\n';
    expect(indentCol(doc)).toBe(2);
  });

  it('indents define-with-args body after signature', () => {
    const doc = '(define (foo x)\n';
    expect(indentCol(doc)).toBe(2);
  });

  it('indents define body when Enter is pressed before trailing close paren', () => {
    const doc = '(define (factorial n))';
    const pos = doc.length - 1;
    const state = schemeState(doc, { anchor: pos });
    const cx = new IndentContext(state, { simulateBreak: pos });
    expect(getIndentation(cx, pos)).toBe(2);
  });

  it('indents define body when Enter is pressed before multiple close parens', () => {
    const cases = [
      { doc: '(define (factorial n)))', pos: 21 },
      { doc: '((define (factorial n)))', pos: 22 },
      { doc: '(define (factorial n))))', pos: 21 },
    ];
    for (const { doc, pos } of cases) {
      const state = schemeState(doc, { anchor: pos });
      const cx = new IndentContext(state, { simulateBreak: pos });
      expect(getIndentation(cx, pos)).toBe(2);
    }
  });

  it('indents when cursor is after param before multiple close parens', () => {
    const doc = '(define (factorial n))';
    const pos = 20;
    const state = schemeState(doc, { anchor: pos });
    const cx = new IndentContext(state, { simulateBreak: pos });
    expect(cx.textAfterPos(pos)).toBe('))');
    expect(getIndentation(cx, pos)).toBe(2);
  });

  it('indents after param before multiple close parens without indent service', () => {
    const doc = '(define (factorial n))';
    const pos = 20;
    const state = EditorState.create({
      doc,
      selection: { anchor: pos },
      extensions: [schemeLanguageDefinition],
    });
    const cx = new IndentContext(state, { simulateBreak: pos });
    expect(getIndentation(cx, pos)).toBe(2);
  });

  it('indents before multiple close parens without indent service fallback', () => {
    const cases = [
      { doc: '(define (factorial n))', pos: 21, label: 'one paren' },
      { doc: '(define (factorial n)))', pos: 21, label: 'two parens' },
    ];
    for (const { doc, pos } of cases) {
      const state = EditorState.create({
        doc,
        selection: { anchor: pos },
        extensions: [schemeLanguageDefinition],
      });
      const cx = new IndentContext(state, { simulateBreak: pos });
      expect(getIndentation(cx, pos)).toBe(2);
    }
  });

  it('indents define body inside let before multiple close parens', () => {
    const doc = '(let () (define (f n)))';
    const pos = doc.length - 2;
    const state = schemeState(doc, { anchor: pos });
    const cx = new IndentContext(state, { simulateBreak: pos });
    expect(getIndentation(cx, pos)).toBe(2);
  });

  it('indents define body when close paren follows on next line', () => {
    const doc = '(define (factorial n)\n)';
    expect(indentCol(doc, doc.indexOf('\n') + 1)).toBe(2);
  });

  it('aligns let bindings with the first binding', () => {
    const doc = '(let ((a 1)\n';
    expect(indentCol(doc)).toBe(6);
  });

  it('indents let body one unit below form head', () => {
    const doc = '(let ((a 1))\n';
    expect(indentCol(doc)).toBe(2);
  });

  it('dedents closing paren to outer form', () => {
    const doc = '(define x\n  1)';
    expect(indentCol(doc, doc.length - 1)).toBe(0);
  });
});

describe('scheme vim coexistence', () => {
  it('uses vim-safe policy when keybinding mode is vim', () => {
    expect(schemeStructuredEditingPolicy('vim')).toBe('vim-safe');
  });

  it('uses full paredit policy in normal mode', () => {
    expect(schemeStructuredEditingPolicy('normal')).toBe('paredit');
  });
});

describe('scheme outline', () => {
  it('collects define forms with nesting depth', () => {
    const source = ['(define (outer x)', '  (define (inner y)', '    y))'].join(
      '\n',
    );
    const items = parseSchemeOutline(source);
    expect(items.map((i) => i.title)).toEqual(['outer', 'inner']);
    expect(items[0]?.depth).toBe(1);
    expect(items[1]?.depth).toBe(2);
  });

  it('collects racket module header', () => {
    const items = parseSchemeOutline(
      '#lang racket/base\n(module child racket/base\n  (define x 1))',
    );
    expect(items.some((i) => i.title === 'child')).toBe(true);
  });
});
