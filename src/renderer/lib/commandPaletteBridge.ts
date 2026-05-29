export interface CommandPaletteOpenOptions {
  prefix?: string;
}

type OpenHandler = (options?: CommandPaletteOpenOptions) => void;

let openHandler: OpenHandler | null = null;

export function registerCommandPaletteOpen(handler: OpenHandler | null): void {
  openHandler = handler;
}

export function requestOpenCommandPalette(
  options?: CommandPaletteOpenOptions,
): boolean {
  if (!openHandler) return false;
  openHandler(options);
  return true;
}
