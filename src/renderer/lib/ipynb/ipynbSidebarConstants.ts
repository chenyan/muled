export const IPYNB_SIDEBAR_WIDTH_DEFAULT = 280;
export const IPYNB_SIDEBAR_WIDTH_MIN = 200;
export const IPYNB_SIDEBAR_WIDTH_MAX = 520;
export const IPYNB_MAIN_MIN_WIDTH = 320;

export function clampIpynbSidebarWidth(
  next: number,
  containerWidth = 0,
): number {
  const dynamicMax =
    containerWidth > 0
      ? Math.min(
          IPYNB_SIDEBAR_WIDTH_MAX,
          containerWidth - IPYNB_MAIN_MIN_WIDTH,
        )
      : IPYNB_SIDEBAR_WIDTH_MAX;
  const max = Math.max(IPYNB_SIDEBAR_WIDTH_MIN, dynamicMax);
  return Math.min(max, Math.max(IPYNB_SIDEBAR_WIDTH_MIN, next));
}
