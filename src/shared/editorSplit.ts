export type SplitPlacement = 'left' | 'right' | 'top' | 'bottom';

export type SplitPaneId = 'primary' | 'secondary';

export interface EditorSplitLayout {
  direction: 'horizontal' | 'vertical';
  /** 第一分区（左或上）所占比例 0.2–0.8 */
  ratio: number;
  primaryTabId: string;
  secondaryTabId: string;
  focusedPane: SplitPaneId;
}

export const SPLIT_RATIO_MIN = 0.2;
export const SPLIT_RATIO_MAX = 0.8;
export const SPLIT_RATIO_DEFAULT = 0.5;

export function splitPlacementDirection(
  placement: SplitPlacement,
): 'horizontal' | 'vertical' {
  return placement === 'left' || placement === 'right' ? 'horizontal' : 'vertical';
}

export function clampSplitRatio(ratio: number): number {
  if (!Number.isFinite(ratio)) return SPLIT_RATIO_DEFAULT;
  return Math.min(SPLIT_RATIO_MAX, Math.max(SPLIT_RATIO_MIN, ratio));
}

/** 新文件应落在哪一侧分区 */
export function splitPlacementNewPane(placement: SplitPlacement): SplitPaneId {
  return placement === 'left' || placement === 'top' ? 'primary' : 'secondary';
}

export function splitPaneTabId(
  layout: EditorSplitLayout,
  pane: SplitPaneId,
): string {
  return pane === 'primary' ? layout.primaryTabId : layout.secondaryTabId;
}

export function splitSurvivorPane(closed: SplitPaneId): SplitPaneId {
  return closed === 'primary' ? 'secondary' : 'primary';
}
