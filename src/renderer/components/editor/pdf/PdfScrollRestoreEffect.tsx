import { useEffect, useRef } from 'react';
import { useScroll } from '@embedpdf/plugin-scroll/react';

interface PdfScrollRestoreEffectProps {
  documentId: string;
  page: number;
}

/** 无 pdfReveal 时，用上次阅读页码恢复滚动位置 */
export default function PdfScrollRestoreEffect({
  documentId,
  page,
}: PdfScrollRestoreEffectProps) {
  const { provides } = useScroll(documentId);
  const restoredRef = useRef(false);

  useEffect(() => {
    if (restoredRef.current || !provides || page < 1) return;
    restoredRef.current = true;
    provides.scrollToPage({
      pageNumber: page,
      behavior: 'instant',
    });
  }, [documentId, page, provides]);

  return null;
}
