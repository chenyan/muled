import { hasPdfTextSelection } from '../renderer/components/editor/pdf/pdfSelection';

describe('hasPdfTextSelection', () => {
  it('returns false when capability is missing', () => {
    expect(hasPdfTextSelection(null, 'doc-1')).toBe(false);
  });

  it('detects selection via selection field', () => {
    const cap = {
      getState: () => ({
        selection: { start: { page: 0, index: 0 }, end: { page: 0, index: 1 } },
        rects: {},
      }),
    };
    expect(hasPdfTextSelection(cap as never, 'doc-1')).toBe(true);
  });

  it('detects selection via highlight rects', () => {
    const cap = {
      getState: () => ({
        selection: null,
        rects: { 0: [{ x: 0, y: 0, width: 1, height: 1 }] },
      }),
    };
    expect(hasPdfTextSelection(cap as never, 'doc-1')).toBe(true);
  });
});
