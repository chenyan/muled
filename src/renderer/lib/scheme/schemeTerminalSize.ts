import { SCHEME_OUTPUT_DEFAULT_HEIGHT } from './schemeOutputConstants';

export const SCHEME_TERMINAL_HEADER_HEIGHT = 28;
export const SCHEME_TERMINAL_PADDING_X = 16;
export const SCHEME_TERMINAL_PADDING_Y = 16;
export const SCHEME_TERMINAL_DEFAULT_CHAR_WIDTH = 8;
export const SCHEME_TERMINAL_DEFAULT_ROW_HEIGHT = 17;

export function estimateSchemeTerminalGrid(args: {
  width: number;
  height: number;
  charWidth?: number;
  rowHeight?: number;
  paddingX?: number;
  paddingY?: number;
}): { cols: number; rows: number } {
  const charWidth = args.charWidth ?? SCHEME_TERMINAL_DEFAULT_CHAR_WIDTH;
  const rowHeight = args.rowHeight ?? SCHEME_TERMINAL_DEFAULT_ROW_HEIGHT;
  const paddingX = args.paddingX ?? SCHEME_TERMINAL_PADDING_X;
  const paddingY = args.paddingY ?? SCHEME_TERMINAL_PADDING_Y;
  const innerWidth = Math.max(0, args.width - paddingX);
  const innerHeight = Math.max(0, args.height - paddingY);
  return {
    cols: Math.max(2, Math.floor(innerWidth / charWidth)),
    rows: Math.max(1, Math.floor(innerHeight / rowHeight)),
  };
}

export function estimateSchemeTerminalGridForPanel(
  panelHeight = SCHEME_OUTPUT_DEFAULT_HEIGHT,
  panelWidth = 640,
): { cols: number; rows: number } {
  const bodyHeight = Math.max(0, panelHeight - SCHEME_TERMINAL_HEADER_HEIGHT);
  return estimateSchemeTerminalGrid({
    width: panelWidth,
    height: bodyHeight,
  });
}
