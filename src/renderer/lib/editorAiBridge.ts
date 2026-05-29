import type { AiApplyMode } from '../../shared/buildAiPrompt';

export interface EditorAiSnapshot {
  selection: string;
  sourceRange: { from: number; to: number } | null;
}

export interface EditorAiHandlers {
  captureSnapshot: () => EditorAiSnapshot | null;
  applyAiResult: (
    snapshot: EditorAiSnapshot,
    mode: AiApplyMode,
    aiText: string,
  ) => string | null;
}

let activeHandlers: { tabId: string; handlers: EditorAiHandlers } | null = null;

export function registerEditorAiHandlers(
  tabId: string,
  handlers: EditorAiHandlers | null,
): void {
  if (!handlers) {
    if (activeHandlers?.tabId === tabId) {
      activeHandlers = null;
    }
    return;
  }
  activeHandlers = { tabId, handlers };
}

export function getEditorAiHandlers(tabId: string): EditorAiHandlers | null {
  if (!activeHandlers || activeHandlers.tabId !== tabId) {
    return null;
  }
  return activeHandlers.handlers;
}
