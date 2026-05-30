import { useCallback } from 'react';
import { useZoom } from '@embedpdf/plugin-zoom/react';

interface PdfZoomToolbarProps {
  documentId: string;
}

export default function PdfZoomToolbar({ documentId }: PdfZoomToolbarProps) {
  const { state, provides } = useZoom(documentId);

  const zoomIn = useCallback(() => {
    provides?.zoomIn();
  }, [provides]);

  const zoomOut = useCallback(() => {
    provides?.zoomOut();
  }, [provides]);

  const actualSize = useCallback(() => {
    provides?.requestZoom(1);
  }, [provides]);

  const disabled = !provides;
  const pct = Math.round((state.currentZoomLevel || 1) * 100);

  return (
    <div className="PdfPreview__zoom" role="group" aria-label="缩放">
      <button
        type="button"
        onClick={zoomOut}
        disabled={disabled}
        title="缩小"
        aria-label="缩小"
      >
        −
      </button>
      <button
        type="button"
        className="PdfPreview__zoomLevel"
        onClick={actualSize}
        disabled={disabled}
        title="原始大小 (100%)"
        aria-label={`当前缩放 ${pct}%，点击恢复原始大小`}
      >
        {pct}%
      </button>
      <button
        type="button"
        onClick={zoomIn}
        disabled={disabled}
        title="放大"
        aria-label="放大"
      >
        +
      </button>
      <button
        type="button"
        className="PdfPreview__actualSize"
        onClick={actualSize}
        disabled={disabled}
        title="原始大小 (100%)"
      >
        原始大小
      </button>
    </div>
  );
}
