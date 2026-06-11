import { parser } from '../renderer/lib/scheme/lezer-scheme/parser.js';

function nodeNames(source: string): string[] {
  const tree = parser.parse(source);
  const names: string[] = [];
  tree.iterate({
    enter(node) {
      if (node.name) {
        names.push(node.name);
      }
    },
  });
  return names;
}

describe('scheme lezer parser', () => {
  it('parses R5RS-style list and boolean', () => {
    const names = nodeNames('(define x #t)');
    expect(names).toContain('List');
    expect(names).toContain('BooleanToken');
    expect(names).toContain('Symbol');
  });

  it('parses Chez curly lists', () => {
    const names = nodeNames('{a b c}');
    expect(names).toContain('CurlyList');
  });

  it('parses Racket vector and lang line', () => {
    const names = nodeNames('#lang racket/base\n#(1 2 3)');
    expect(names).toContain('LangLine');
    expect(names).toContain('Vector');
  });

  it('parses Guile keyword prefix', () => {
    const names = nodeNames('(#:key 1)');
    expect(names).toContain('Keyword');
  });

  it('parses block and line comments', () => {
    const names = nodeNames('; line\n#| block |#\n(+ 1 2)');
    expect(names).toContain('LineComment');
    expect(names).toContain('BlockCommentText');
    expect(names).toContain('List');
  });
});
