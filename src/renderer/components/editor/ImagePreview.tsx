import { useCallback, useEffect, useState } from 'react';
import type { EditorTab } from '../../types/tab';
import { tabLabel } from '../../types/tab';

interface ImagePreviewProps {
  tab: EditorTab;
}

const ZOOM_STEP = 0.25;
const MIN_SCALE = 0.25;
const MAX_SCALE = 4;

export default function ImagePreview({ tab }: ImagePreviewProps) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    setScale(1);
  }, [tab.id, tab.imageSrc]);

  const zoomIn = useCallback(() => {
    setScale((s) => Math.min(MAX_SCALE, s + ZOOM_STEP));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((s) => Math.max(MIN_SCALE, s - ZOOM_STEP));
  }, []);

  const resetZoom = useCallback(() => {
    setScale(1);
  }, []);

  if (!tab.imageSrc) {
    return <div className="ImagePreview ImagePreview--empty">无法加载图片</div>;
  }

  const name = tab.relativePath ? tabLabel(tab) : 'image';

  return (
    <div className="ImagePreview">
      <div className="ImagePreview__toolbar">
        <span
          className="ImagePreview__name"
          title={tab.relativePath ?? undefined}
        >
          {name}
        </span>
        <div className="ImagePreview__zoom" role="group" aria-label="缩放">
          <button type="button" onClick={zoomOut} title="缩小">
            −
          </button>
          <button type="button" onClick={resetZoom} title="适应窗口">
            {Math.round(scale * 100)}%
          </button>
          <button type="button" onClick={zoomIn} title="放大">
            +
          </button>
        </div>
      </div>
      <div className="ImagePreview__viewport">
        <img
          src={tab.imageSrc}
          alt={name}
          style={{ transform: `scale(${scale})` }}
          draggable={false}
        />
      </div>
    </div>
  );
}
