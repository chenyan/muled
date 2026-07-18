import {
  IPYNB_MAIN_MIN_WIDTH,
  IPYNB_SIDEBAR_WIDTH_MAX,
  IPYNB_SIDEBAR_WIDTH_MIN,
  clampIpynbSidebarWidth,
} from '../renderer/lib/ipynb/ipynbSidebarConstants';

describe('clampIpynbSidebarWidth', () => {
  it('clamps to min and max', () => {
    expect(clampIpynbSidebarWidth(100)).toBe(IPYNB_SIDEBAR_WIDTH_MIN);
    expect(clampIpynbSidebarWidth(999)).toBe(IPYNB_SIDEBAR_WIDTH_MAX);
  });

  it('respects remaining main area width', () => {
    const containerWidth = IPYNB_MAIN_MIN_WIDTH + 250;
    expect(clampIpynbSidebarWidth(400, containerWidth)).toBe(250);
  });
});
