import { useEffect, useRef } from 'react';
import { useScroll, useScrollCapability } from '@embedpdf/plugin-scroll/react';
import type { PdfRevealTarget } from '../../../types/tab';

interface PdfMnoteScrollEffectProps {
  documentId: string;
  reveal: PdfRevealTarget | null | undefined;
  onRevealComplete?: () => void;
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

function buildScrollTarget(
  scrollCap: ReturnType<typeof useScrollCapability>['provides'],
  documentId: string,
  reveal: PdfRevealTarget,
): { page: number; coords?: { x: number; y: number } } {
  if (!reveal.bbox) {
    return { page: reveal.page };
  }
  const pageSize = pageSizeFromLayout(scrollCap, documentId, reveal.page);
  if (!pageSize) {
    return { page: reveal.page };
  }
  const [x1, y1, x2, y2] = reveal.bbox;
  return {
    page: reveal.page,
    coords: {
      x: ((x1 + x2) / 2) * pageSize.width,
      y: y1 * pageSize.height,
    },
  };
}

/** 响应 pdfReveal 滚动到目标页（及 bbox 中心），一次性执行后回调 onRevealComplete */
export default function PdfMnoteScrollEffect({
  documentId,
  reveal,
  onRevealComplete,
}: PdfMnoteScrollEffectProps) {
  const { provides: scrollCap } = useScrollCapability();
  const { provides } = useScroll(documentId);
  const appliedRevealIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!reveal) {
      appliedRevealIdRef.current = null;
      return undefined;
    }
    if (!provides || appliedRevealIdRef.current === reveal.id) {
      return undefined;
    }
    appliedRevealIdRef.current = reveal.id;

    const scroll = () => {
      const scrollTarget = buildScrollTarget(scrollCap, documentId, reveal);
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
    const complete = window.setTimeout(() => {
      onRevealComplete?.();
    }, 400);

    return () => {
      window.clearTimeout(retry1);
      window.clearTimeout(retry2);
      window.clearTimeout(complete);
    };
    // scrollCap is read inside scroll(); retries pick up layout when it becomes ready
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId, onRevealComplete, provides, reveal?.id]);

  return null;
}
