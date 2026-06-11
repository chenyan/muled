import { useEffect, useRef } from 'react';
import { useScroll } from '@embedpdf/plugin-scroll/react';

interface PdfPageSyncListenerProps {
  documentId: string;
  onPageChange?: (page: number) => void;
}

export default function PdfPageSyncListener({
  documentId,
  onPageChange,
}: PdfPageSyncListenerProps) {
  const { state } = useScroll(documentId);
  const lastPageRef = useRef<number | null>(null);

  useEffect(() => {
    if (!onPageChange) return;
    const page = state.currentPage;
    if (!page || page === lastPageRef.current) return;
    lastPageRef.current = page;
    onPageChange(page);
  }, [onPageChange, state.currentPage]);

  return null;
}
