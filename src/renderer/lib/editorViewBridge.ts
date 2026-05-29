export interface EditorViewHandlers {
  getEditorContent: () => string;
}

let active: { tabId: string; handlers: EditorViewHandlers } | null = null;

export function registerEditorViewHandlers(
  tabId: string,
  handlers: EditorViewHandlers | null,
): void {
  if (!handlers) {
    if (active?.tabId === tabId) active = null;
    return;
  }
  active = { tabId, handlers };
}

export function getEditorViewContent(tabId: string): string | null {
  if (!active || active.tabId !== tabId) return null;
  return active.handlers.getEditorContent();
}
