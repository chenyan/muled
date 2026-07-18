import type { SymbolDef, SymbolPickerOpenOptions, SymbolRef } from './types';

export type SymbolRevealTarget = Pick<
  SymbolDef,
  'relativePath' | 'line' | 'column' | 'from' | 'to' | 'name'
> &
  Partial<Pick<SymbolRef, 'name'>>;

type RevealHandler = (target: SymbolRevealTarget) => void;
type OpenPickerHandler = (options: SymbolPickerOpenOptions) => void;

let revealHandler: RevealHandler | null = null;
let openPickerHandler: OpenPickerHandler | null = null;

export function registerSymbolReveal(handler: RevealHandler | null): void {
  revealHandler = handler;
}

export function registerSymbolPickerOpen(
  handler: OpenPickerHandler | null,
): void {
  openPickerHandler = handler;
}

export function requestRevealSymbol(target: SymbolRevealTarget): boolean {
  if (!revealHandler) return false;
  revealHandler(target);
  return true;
}

export function requestOpenSymbolPicker(
  options: SymbolPickerOpenOptions,
): boolean {
  if (!openPickerHandler) return false;
  openPickerHandler(options);
  return true;
}
