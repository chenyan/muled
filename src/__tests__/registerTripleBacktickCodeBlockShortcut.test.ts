import { matchTripleBacktickLine } from '../renderer/lib/registerTripleBacktickCodeBlockShortcut';

describe('matchTripleBacktickLine', () => {
  it('matches three backticks at line start', () => {
    const match = matchTripleBacktickLine('```', 3);
    expect(match).not.toBeNull();
    expect(match?.[1]).toBe('');
  });

  it('matches optional language without trailing space', () => {
    const match = matchTripleBacktickLine('```js', 5);
    expect(match).not.toBeNull();
    expect(match?.[1]).toBe('js');
  });

  it('matches leading indentation', () => {
    const match = matchTripleBacktickLine('  ```', 5);
    expect(match).not.toBeNull();
  });

  it('does not match partial backticks', () => {
    expect(matchTripleBacktickLine('``', 2)).toBeNull();
    expect(matchTripleBacktickLine('````', 4)).toBeNull();
  });

  it('does not match when caret is not at fence end', () => {
    expect(matchTripleBacktickLine('```', 2)).toBeNull();
    expect(matchTripleBacktickLine('```js', 3)).toBeNull();
  });

  it('does not match inline fence in paragraph text', () => {
    expect(matchTripleBacktickLine('text ```', 8)).toBeNull();
  });
});
