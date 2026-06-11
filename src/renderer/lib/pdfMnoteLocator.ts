import type { SelectionCapability } from '@embedpdf/plugin-selection';
import type { ScrollCapability } from '@embedpdf/plugin-scroll';
import type { Rect } from '@embedpdf/models';

function mergeBounds(bounds: { page: number; rect: Rect }[]): {
  page: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} | null {
  if (!bounds.length) return null;
  const page = bounds[0]!.page;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const item of bounds) {
    if (item.page !== page) continue;
    const { origin, size } = item.rect;
    minX = Math.min(minX, origin.x);
    minY = Math.min(minY, origin.y);
    maxX = Math.max(maxX, origin.x + size.width);
    maxY = Math.max(maxY, origin.y + size.height);
  }

  if (!Number.isFinite(minX)) return null;
  return { page, minX, minY, maxX, maxY };
}

function pageSizeFromLayout(
  scrollCap: ScrollCapability,
  documentId: string,
  pageNumber: number,
): { width: number; height: number } | null {
  const layout = scrollCap.forDocument(documentId).getLayout();
  for (const item of layout.virtualItems) {
    for (const page of item.pageLayouts) {
      if (page.pageNumber === pageNumber) {
        return { width: page.rotatedWidth, height: page.rotatedHeight };
      }
    }
  }
  return null;
}

function formatBbox(
  merged: { minX: number; minY: number; maxX: number; maxY: number },
  pageSize: { width: number; height: number },
): string {
  const x1 = (merged.minX / pageSize.width).toFixed(4);
  const y1 = (merged.minY / pageSize.height).toFixed(4);
  const x2 = (merged.maxX / pageSize.width).toFixed(4);
  const y2 = (merged.maxY / pageSize.height).toFixed(4);
  return `${x1},${y1},${x2},${y2}`;
}

function escapeLocText(text: string): string {
  return text.replace(/;/g, '\\;').trim();
}

export function buildPdfMnoteLoc(
  selectionCap: SelectionCapability | null | undefined,
  scrollCap: ScrollCapability | null | undefined,
  documentId: string,
  currentPage: number,
  selectedText: string | null | undefined,
): string {
  const bounds = selectionCap?.getBoundingRects(documentId) ?? [];
  const merged = mergeBounds(bounds);

  if (merged && scrollCap) {
    // getBoundingRects 返回 0-based pageIndex；loc 与 scrollToPage 统一用 1-based
    const pageNumber = merged.page + 1;
    const pageSize = pageSizeFromLayout(scrollCap, documentId, pageNumber);
    if (pageSize && pageSize.width > 0 && pageSize.height > 0) {
      const bbox = formatBbox(merged, pageSize);
      const text = selectedText?.trim();
      if (text) {
        return `page=${pageNumber}; bbox=${bbox}; text=${escapeLocText(text)}`;
      }
      return `page=${pageNumber}; bbox=${bbox}`;
    }
    return `page=${pageNumber}`;
  }

  const text = selectedText?.trim();
  if (text) {
    return `page=${currentPage}; text=${escapeLocText(text)}`;
  }
  return `page=${currentPage}`;
}
