export interface DocxEditorHandlers {
  saveToBuffer: () => Promise<ArrayBuffer | null>;
}

const handlersByTabId = new Map<string, DocxEditorHandlers>();

export function registerDocxEditorHandlers(
  tabId: string,
  handlers: DocxEditorHandlers | null,
): void {
  if (!handlers) {
    handlersByTabId.delete(tabId);
    return;
  }
  handlersByTabId.set(tabId, handlers);
}

export function getDocxEditorBuffer(tabId: string): Promise<ArrayBuffer | null> {
  const handlers = handlersByTabId.get(tabId);
  if (!handlers) {
    return Promise.resolve(null);
  }
  return handlers.saveToBuffer();
}
