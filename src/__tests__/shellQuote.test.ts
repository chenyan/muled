import { quoteShellSearchPattern } from '../shared/shellQuote';

describe('quoteShellSearchPattern', () => {
  it('leaves patterns without whitespace unchanged', () => {
    expect(quoteShellSearchPattern('MyPage')).toBe('MyPage');
    expect(quoteShellSearchPattern(' 熵 ')).toBe('熵');
  });

  it('wraps patterns with spaces in double quotes', () => {
    expect(quoteShellSearchPattern('My Page')).toBe('"My Page"');
    expect(quoteShellSearchPattern('  foo bar  ')).toBe('"foo bar"');
  });

  it('escapes embedded quotes and backslashes', () => {
    expect(quoteShellSearchPattern('say "hi"')).toBe('"say \\"hi\\""');
    expect(quoteShellSearchPattern('a\\b c')).toBe('"a\\\\b c"');
  });
});
