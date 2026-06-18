export interface EditorOutlineHandlers {
  revealOutlineTarget: (target: {
    line: number | null;
    title: string;
    hash?: string | null;
  }) => boolean;
}

const handlers = new Map<string, EditorOutlineHandlers>();

export function registerEditorOutlineHandlers(
  tabId: string,
  value: EditorOutlineHandlers | null,
): void {
  if (value) {
    handlers.set(tabId, value);
    return;
  }
  handlers.delete(tabId);
}

export function getEditorOutlineHandlers(
  tabId: string,
): EditorOutlineHandlers | null {
  return handlers.get(tabId) ?? null;
}
