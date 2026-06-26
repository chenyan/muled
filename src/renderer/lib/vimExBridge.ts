export interface VimExHandlers {
  save: () => void;
  quit: () => void;
  writeAndQuit: () => void;
  edit: (path?: string) => void;
}

let handlers: VimExHandlers | null = null;

export function registerVimExHandlers(next: VimExHandlers | null): void {
  handlers = next;
}

export function requestVimSave(): boolean {
  if (!handlers) return false;
  handlers.save();
  return true;
}

export function requestVimQuit(): boolean {
  if (!handlers) return false;
  handlers.quit();
  return true;
}

export function requestVimWriteAndQuit(): boolean {
  if (!handlers) return false;
  handlers.writeAndQuit();
  return true;
}

export function requestVimEdit(path?: string): boolean {
  if (!handlers) return false;
  handlers.edit(path);
  return true;
}
