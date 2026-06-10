export const FLOATING_MENU_VIEWPORT_PADDING = 8;

export function clampFloatingMenuPosition(
  x: number,
  y: number,
  menuWidth: number,
  menuHeight: number,
  padding = FLOATING_MENU_VIEWPORT_PADDING,
): { left: number; top: number } {
  const maxLeft = Math.max(padding, window.innerWidth - menuWidth - padding);
  const maxTop = Math.max(padding, window.innerHeight - menuHeight - padding);
  return {
    left: Math.min(Math.max(x, padding), maxLeft),
    top: Math.min(Math.max(y, padding), maxTop),
  };
}
