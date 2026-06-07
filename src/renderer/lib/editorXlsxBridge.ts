export interface XlsxEditorHandlers {
  saveToBuffer: () => Promise<ArrayBuffer | null>;
}

const handlersByTabId = new Map<string, XlsxEditorHandlers>();

export function registerXlsxEditorHandlers(
  tabId: string,
  handlers: XlsxEditorHandlers | null,
): void {
  if (!handlers) {
    handlersByTabId.delete(tabId);
    return;
  }
  handlersByTabId.set(tabId, handlers);
}

export function getXlsxEditorBuffer(
  tabId: string,
): Promise<ArrayBuffer | null> {
  const handlers = handlersByTabId.get(tabId);
  if (!handlers) {
    return Promise.resolve(null);
  }
  return handlers.saveToBuffer();
}
