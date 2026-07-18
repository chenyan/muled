/** 单次打开 notebook 内，每个 cell 的运行次数上限；达到后下次运行归 1 重新计数。 */
export const IPYNB_CELL_SESSION_RUN_MAX = 5;

/** 每次运行完成后递增；超过上限则归 1。 */
export function nextIpynbCellSessionRunCount(current: number): number {
  const next = current + 1;
  return next > IPYNB_CELL_SESSION_RUN_MAX ? 1 : next;
}

/** 运行次数对应的背景混色比例（0 → 最浅，5 → 微深）。 */
export function ipynbCellSessionRunTintPercent(runs: number): string {
  if (runs <= 0) return '0%';
  const clamped = Math.min(runs, IPYNB_CELL_SESSION_RUN_MAX);
  return `${clamped * 2.5}%`;
}
