import {
  SIDEBAR_WIDTH_DEFAULT,
  SIDEBAR_WIDTH_MAX,
  SIDEBAR_WIDTH_MIN,
} from '../shared/constants';
import { clampSidebarWidth } from '../shared/sidebarLayout';

describe('clampSidebarWidth', () => {
  it('clamps to min and max', () => {
    expect(clampSidebarWidth(50)).toBe(SIDEBAR_WIDTH_MIN);
    expect(clampSidebarWidth(9999)).toBe(SIDEBAR_WIDTH_MAX);
    expect(clampSidebarWidth(300.7)).toBe(301);
  });

  it('returns default for non-finite input', () => {
    expect(clampSidebarWidth(Number.NaN)).toBe(SIDEBAR_WIDTH_DEFAULT);
  });
});
