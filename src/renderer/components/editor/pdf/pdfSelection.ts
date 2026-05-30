import type { SelectionCapability } from '@embedpdf/plugin-selection';

export function hasPdfTextSelection(
  selectionCap: SelectionCapability | null | undefined,
  documentId: string,
): boolean {
  if (!selectionCap) return false;
  const state = selectionCap.getState(documentId);
  if (state.selection != null) return true;
  return Object.values(state.rects).some((pageRects) => pageRects.length > 0);
}
