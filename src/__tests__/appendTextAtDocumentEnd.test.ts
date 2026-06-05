import { appendTextAtDocumentEnd } from '../renderer/lib/appendTextAtDocumentEnd';

describe('appendTextAtDocumentEnd', () => {
  it('appends to empty document with trailing newline', () => {
    expect(appendTextAtDocumentEnd('', 'hello')).toBe('hello\n');
  });

  it('adds newline before text when document has no trailing newline', () => {
    expect(appendTextAtDocumentEnd('line1', 'line2')).toBe('line1\nline2\n');
  });

  it('does not add extra gap when document already ends with newline', () => {
    expect(appendTextAtDocumentEnd('line1\n', 'line2')).toBe('line1\nline2\n');
  });

  it('ignores whitespace-only append', () => {
    expect(appendTextAtDocumentEnd('keep', '   ')).toBe('keep');
  });
});
