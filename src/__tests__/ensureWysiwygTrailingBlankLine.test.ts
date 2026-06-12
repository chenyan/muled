import { ensureWysiwygTrailingBlankLine } from '../renderer/lib/ensureWysiwygTrailingBlankLine';

describe('ensureWysiwygTrailingBlankLine', () => {
  it('adds blank trailing line', () => {
    expect(ensureWysiwygTrailingBlankLine('# title')).toBe('# title\n\n');
    expect(ensureWysiwygTrailingBlankLine('# title\n')).toBe('# title\n\n');
    expect(ensureWysiwygTrailingBlankLine('# title\n\n')).toBe('# title\n\n');
  });

  it('returns single newline for empty document', () => {
    expect(ensureWysiwygTrailingBlankLine('')).toBe('\n');
    expect(ensureWysiwygTrailingBlankLine('   ')).toBe('\n');
  });
});
