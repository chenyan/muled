import { pdfScrollRectToClientRect } from '../renderer/lib/pdfSelectionAnchorRect';

describe('pdfScrollRectToClientRect', () => {
  it('maps scroll-space origin to client coordinates', () => {
    const rect = pdfScrollRectToClientRect({
      scrollPosition: {
        origin: { x: 10, y: 200 },
        size: { width: 100, height: 20 },
      },
      viewportLeft: 50,
      viewportTop: 100,
      scrollTop: 150,
      scrollLeft: 5,
    });

    expect(rect.left).toBe(55);
    expect(rect.top).toBe(150);
    expect(rect.width).toBe(100);
    expect(rect.height).toBe(20);
  });
});
