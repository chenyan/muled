export interface EditorViewHandlers {
  getEditorContent: () => string;
  /** 离开当前视图时采集内容（WYSIWYG 需读编辑器实时状态） */
  getContentForViewSwitch: () => string;
  appendToEnd: (text: string) => void;
}

const handlersByTabId = new Map<string, EditorViewHandlers>();

export function registerEditorViewHandlers(
  tabId: string,
  handlers: EditorViewHandlers | null,
): void {
  if (!handlers) {
    handlersByTabId.delete(tabId);
    return;
  }
  handlersByTabId.set(tabId, handlers);
}

export function getEditorViewContent(tabId: string): string | null {
  return handlersByTabId.get(tabId)?.getEditorContent() ?? null;
}

export function getEditorContentForViewSwitch(tabId: string): string | null {
  return handlersByTabId.get(tabId)?.getContentForViewSwitch() ?? null;
}

export function appendTextToEditorTab(tabId: string, text: string): boolean {
  const handlers = handlersByTabId.get(tabId);
  if (!handlers) {
    return false;
  }
  handlers.appendToEnd(text);
  return true;
}
