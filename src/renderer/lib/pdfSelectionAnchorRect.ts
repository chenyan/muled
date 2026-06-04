import type { SelectionCapability } from '@embedpdf/plugin-selection';
import type { ScrollCapability } from '@embedpdf/plugin-scroll';
import type { ViewportCapability } from '@embedpdf/plugin-viewport';
import type { Rect } from '@embedpdf/models';

export interface PdfScrollRectToClientInput {
  scrollPosition: Rect;
  viewportLeft: number;
  viewportTop: number;
  scrollTop: number;
  scrollLeft: number;
}

export interface PdfClientRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** 将 scroll 容器内的选区矩形换算为视口 client 坐标。 */
export function pdfScrollRectToClientRect(
  input: PdfScrollRectToClientInput,
): PdfClientRect {
  const { scrollPosition, viewportLeft, viewportTop, scrollTop, scrollLeft } =
    input;
  return {
    left: viewportLeft + scrollPosition.origin.x - scrollLeft,
    top: viewportTop + scrollPosition.origin.y - scrollTop,
    width: scrollPosition.size.width,
    height: scrollPosition.size.height,
  };
}

export function pdfSelectionToClientRect(
  documentId: string,
  selectionCap: SelectionCapability,
  scrollCap: ScrollCapability,
  viewportCap: ViewportCapability,
  viewportEl: HTMLElement,
): DOMRect | null {
  const bounds = selectionCap.getBoundingRects(documentId);
  if (!bounds.length) return null;

  const { page, rect } = bounds[bounds.length - 1]!;
  const scrollPosition = scrollCap
    .forDocument(documentId)
    .getRectPositionForPage(page, rect);
  if (!scrollPosition) return null;

  const metrics = viewportCap.forDocument(documentId).getMetrics();
  const viewportRect = viewportEl.getBoundingClientRect();
  const client = pdfScrollRectToClientRect({
    scrollPosition,
    viewportLeft: viewportRect.left,
    viewportTop: viewportRect.top,
    scrollTop: metrics.scrollTop,
    scrollLeft: metrics.scrollLeft,
  });
  return new DOMRect(client.left, client.top, client.width, client.height);
}
