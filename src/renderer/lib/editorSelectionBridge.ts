export interface ActiveEditorSelection {
  tabId: string;
  from: number;
  to: number;
}

let activeSelection: ActiveEditorSelection | null = null;

export function setActiveEditorSelection(
  selection: ActiveEditorSelection | null,
): void {
  activeSelection = selection;
}

export function getActiveEditorSelection(
  tabId: string,
): { from: number; to: number } | null {
  if (!activeSelection || activeSelection.tabId !== tabId) {
    return null;
  }
  if (activeSelection.from === activeSelection.to) {
    return null;
  }
  return { from: activeSelection.from, to: activeSelection.to };
}
