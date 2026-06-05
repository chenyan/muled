export type SplitPlacement = 'left' | 'right' | 'top' | 'bottom';

export type SplitPaneId = 'primary' | 'secondary';

export interface EditorSplitLayout {
  direction: 'horizontal' | 'vertical';
  /** 第一分区（左或上）所占比例 0.2–0.8 */
  ratio: number;
  primaryTabId: string;
  secondaryTabId: string;
  focusedPane: SplitPaneId;
  /** 仅用于分屏渲染、不在 Tab 栏显示的标签 id */
  paneOnlyTabIds?: readonly string[];
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

export function isSplitPaneOnlyTab(
  layout: EditorSplitLayout | null,
  tabId: string,
): boolean {
  if (!layout) return false;
  return (layout.paneOnlyTabIds ?? []).includes(tabId);
}

/** 分屏时过滤掉 pane-only 标签，避免 Tab 栏重复 */
export function tabsForTabBar<T extends { id: string }>(
  tabs: readonly T[],
  split: EditorSplitLayout | null,
): T[] {
  if (!split?.paneOnlyTabIds?.length) return [...tabs];
  const hidden = new Set(split.paneOnlyTabIds);
  return tabs.filter((t) => !hidden.has(t.id));
}

/** 激活标签在 Tab 栏被隐藏时，高亮仍可见的分屏伙伴 */
export function tabBarActiveTabId(
  activeTabId: string | null,
  split: EditorSplitLayout | null,
): string | null {
  if (!activeTabId || !isSplitPaneOnlyTab(split, activeTabId)) {
    return activeTabId;
  }
  return activeTabId === split!.primaryTabId
    ? split!.secondaryTabId
    : split!.primaryTabId;
}
