import {
  extractSchemeTopLevelSymbols,
  mergeSchemeTerminalSymbols,
} from '../renderer/lib/scheme/schemeTerminalSymbolTracker';

describe('extractSchemeTopLevelSymbols', () => {
  it('extracts define and define-syntax names', () => {
    const source = `
(define (factorial n) (if (= n 0) 1 (* n (factorial (- n 1)))))
(define-syntax let1
  (syntax-rules () ((_ (name val) body ...) (let ((name val)) body ...))))
`;
    expect(extractSchemeTopLevelSymbols(source)).toEqual([
      'factorial',
      'let1',
    ]);
  });
});

describe('mergeSchemeTerminalSymbols', () => {
  it('merges without duplicates', () => {
    expect(mergeSchemeTerminalSymbols(['a', 'b'], ['b', 'c'])).toEqual([
      'a',
      'b',
      'c',
    ]);
  });
});
