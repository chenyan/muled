import {
  collectSchemeTerminalCompletions,
  completionInsertSuffix,
} from '../renderer/lib/scheme/schemeTerminalCompletion';
import {
  resolveSchemeEditorEnvSymbols,
  buildSchemeEditorCompletionResult,
} from '../renderer/lib/scheme/schemeEditorCompletion';
import {
  extractSchemeCompletionPrefix,
  parseSchemeTerminalInputLine,
} from '../renderer/lib/scheme/schemeTerminalInputLine';
import { buildSchemeInputLineHtml } from '../renderer/lib/scheme/schemeTerminalHighlight';

describe('parseSchemeTerminalInputLine', () => {
  it('parses Chez prompt input line', () => {
    expect(parseSchemeTerminalInputLine('> (+ 1 2)', 9)).toEqual({
      promptLen: 2,
      input: '(+ 1 2)',
      cursorCol: 9,
    });
  });

  it('returns null for non-prompt lines', () => {
    expect(parseSchemeTerminalInputLine('42', 2)).toBeNull();
  });
});

describe('extractSchemeCompletionPrefix', () => {
  it('extracts identifier prefix before cursor', () => {
    expect(extractSchemeCompletionPrefix('(+ define-foo ', 14)).toEqual({
      prefix: 'define-foo',
      startCol: 3,
    });
  });

  it('returns empty prefix at whitespace', () => {
    expect(extractSchemeCompletionPrefix('(+ ', 3)).toEqual({
      prefix: '',
      startCol: 3,
    });
  });
});

describe('collectSchemeTerminalCompletions', () => {
  it('matches keywords and environment symbols by prefix', () => {
    const matches = collectSchemeTerminalCompletions({
      prefix: 'def',
      envSymbols: ['define-helper', 'foo'],
    });
    expect(matches.some((m) => m.label === 'define' && m.kind === 'keyword')).toBe(
      true,
    );
    expect(
      matches.some((m) => m.label === 'define-helper' && m.kind === 'symbol'),
    ).toBe(true);
    expect(matches.some((m) => m.label === 'foo')).toBe(false);
  });
});

describe('completionInsertSuffix', () => {
  it('returns remaining characters after shared prefix', () => {
    expect(completionInsertSuffix('def', 'define')).toBe('ine');
  });
});

describe('resolveSchemeEditorEnvSymbols', () => {
  it('merges document defines with extra env symbols', () => {
    const symbols = resolveSchemeEditorEnvSymbols(
      '(define helper 1)\n(define-syntax kw (syntax-rules () ((kw x) x)))',
      ['from-repl'],
    );
    expect(symbols).toEqual(
      expect.arrayContaining(['helper', 'kw', 'from-repl']),
    );
  });
});

describe('buildSchemeEditorCompletionResult', () => {
  it('returns keyword matches for identifier prefix', () => {
    const doc = '(define helper 1)\n(def';
    const result = buildSchemeEditorCompletionResult({
      doc,
      pos: doc.length,
    });
    expect(result?.from).toBe(doc.length - 3);
    expect(result?.options.some((o) => o.label === 'define')).toBe(true);
  });

  it('includes document define bindings when prefix matches', () => {
    const doc = '(define helper 1)\n(hel';
    const result = buildSchemeEditorCompletionResult({
      doc,
      pos: doc.length,
    });
    expect(result?.options.some((o) => o.label === 'helper')).toBe(true);
  });
});

describe('buildSchemeInputLineHtml', () => {
  it('wraps keywords and strings with highlight classes', () => {
    const html = buildSchemeInputLineHtml('> ', '(define x "hi")', 15);
    expect(html).toContain('SchemeTerminalPane__hl-keyword');
    expect(html).toContain('SchemeTerminalPane__hl-string');
    expect(html).toContain('define');
  });
});
