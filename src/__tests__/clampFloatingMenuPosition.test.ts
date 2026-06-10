import { clampFloatingMenuPosition } from '../renderer/lib/clampFloatingMenuPosition';

describe('clampFloatingMenuPosition', () => {
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;

  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 800,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 600,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: originalInnerWidth,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: originalInnerHeight,
    });
  });

  it('keeps the anchor when the menu fits', () => {
    expect(clampFloatingMenuPosition(120, 80, 160, 200)).toEqual({
      left: 120,
      top: 80,
    });
  });

  it('shifts the menu upward when it would overflow the bottom edge', () => {
    expect(clampFloatingMenuPosition(120, 500, 160, 220)).toEqual({
      left: 120,
      top: 372,
    });
  });

  it('shifts the menu leftward when it would overflow the right edge', () => {
    expect(clampFloatingMenuPosition(700, 80, 160, 200)).toEqual({
      left: 632,
      top: 80,
    });
  });
});
