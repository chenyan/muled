import { useEffect, useMemo } from 'react';
import { useScroll, useScrollCapability } from '@embedpdf/plugin-scroll/react';
import type { PdfRevealTarget } from '../../../types/tab';

interface PdfMnoteScrollEffectProps {
  documentId: string;
  reveal: PdfRevealTarget | null | undefined;
}

function pageSizeFromLayout(
  scrollCap: ReturnType<typeof useScrollCapability>['provides'],
  documentId: string,
  pageNumber: number,
): { width: number; height: number } | null {
  if (!scrollCap) return null;
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

/** 响应 pdfReveal 滚动到目标页（及 bbox 中心） */
export default function PdfMnoteScrollEffect({
  documentId,
  reveal,
}: PdfMnoteScrollEffectProps) {
  const { provides: scrollCap } = useScrollCapability();
  const { provides } = useScroll(documentId);

  const scrollTarget = useMemo(() => {
    if (!reveal) return null;
    if (!reveal.bbox) {
      return { page: reveal.page, coords: undefined };
    }
    const pageSize = pageSizeFromLayout(scrollCap, documentId, reveal.page);
    if (!pageSize) {
      return { page: reveal.page, coords: undefined };
    }
    const [x1, y1, x2, y2] = reveal.bbox;
    return {
      page: reveal.page,
      coords: {
        x: ((x1 + x2) / 2) * pageSize.width,
        y: y1 * pageSize.height,
      },
    };
  }, [documentId, reveal, scrollCap]);

  useEffect(() => {
    if (!scrollTarget || !provides || !reveal) return undefined;

    const scroll = () => {
      provides.scrollToPage({
        pageNumber: scrollTarget.page,
        behavior: 'instant',
        alignY: 20,
        ...(scrollTarget.coords
          ? { pageCoordinates: scrollTarget.coords }
          : {}),
      });
    };

    scroll();
    const retry1 = window.setTimeout(scroll, 80);
    const retry2 = window.setTimeout(scroll, 320);

    return () => {
      window.clearTimeout(retry1);
      window.clearTimeout(retry2);
    };
  }, [provides, reveal?.id, scrollTarget]);

  return null;
}
