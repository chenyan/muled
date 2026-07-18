import {
  IPYNB_CELL_SESSION_RUN_MAX,
  ipynbCellSessionRunTintPercent,
  nextIpynbCellSessionRunCount,
} from '../renderer/lib/ipynb/ipynbCellSessionRuns';

describe('nextIpynbCellSessionRunCount', () => {
  it('increments until max then wraps to 1', () => {
    expect(nextIpynbCellSessionRunCount(0)).toBe(1);
    expect(nextIpynbCellSessionRunCount(4)).toBe(5);
    expect(nextIpynbCellSessionRunCount(IPYNB_CELL_SESSION_RUN_MAX)).toBe(1);
  });
});

describe('ipynbCellSessionRunTintPercent', () => {
  it('returns progressively darker tint for 1..max runs', () => {
    expect(ipynbCellSessionRunTintPercent(0)).toBe('0%');
    expect(ipynbCellSessionRunTintPercent(1)).toBe('2.5%');
    expect(ipynbCellSessionRunTintPercent(5)).toBe('12.5%');
  });
});
