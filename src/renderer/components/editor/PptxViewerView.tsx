import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PPTXViewer } from 'pptxviewjs';
import './PptxViewerView.css';
import { dataUrlToArrayBuffer } from '../../lib/dataUrl';
import type { EditorTab } from '../../types/tab';
import { tabLabel } from '../../types/tab';

interface PptxViewerViewProps {
  tab: EditorTab;
}

/** 默认 4:3 幻灯片在 96 DPI 下的逻辑像素尺寸 */
const SLIDE_WIDTH_PX = 960;
const SLIDE_HEIGHT_PX = 720;
const VIEWPORT_PAD = 32;
const ZOOM_STEP = 0.25;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;

type SizeMode = 'fit' | 'actual';

function computeDisplaySize(
  viewportW: number,
  viewportH: number,
  sizeMode: SizeMode,
  zoomScale: number,
): { width: number; height: number } {
  const availW = Math.max(1, viewportW - VIEWPORT_PAD);
  const availH = Math.max(1, viewportH - VIEWPORT_PAD);

  let baseW: number;
  let baseH: number;
  if (sizeMode === 'actual') {
    baseW = SLIDE_WIDTH_PX;
    baseH = SLIDE_HEIGHT_PX;
  } else {
    const fit = Math.min(availW / SLIDE_WIDTH_PX, availH / SLIDE_HEIGHT_PX);
    baseW = SLIDE_WIDTH_PX * fit;
    baseH = SLIDE_HEIGHT_PX * fit;
  }

  return {
    width: Math.max(1, Math.round(baseW * zoomScale)),
    height: Math.max(1, Math.round(baseH * zoomScale)),
  };
}

function zoomPercent(
  viewportW: number,
  viewportH: number,
  sizeMode: SizeMode,
  zoomScale: number,
): number {
  if (viewportW <= 0 || viewportH <= 0) return 100;
  const { width } = computeDisplaySize(
    viewportW,
    viewportH,
    sizeMode,
    zoomScale,
  );
  return Math.round((width / SLIDE_WIDTH_PX) * 100);
}

export default function PptxViewerView({ tab }: PptxViewerViewProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<PPTXViewer | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [slideCount, setSlideCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [viewportSize, setViewportSize] = useState({ w: 0, h: 0 });
  const [sizeMode, setSizeMode] = useState<SizeMode>('fit');
  const [zoomScale, setZoomScale] = useState(1);

  const buffer = useMemo(() => {
    if (!tab.pptxSrc) return null;
    return dataUrlToArrayBuffer(tab.pptxSrc);
  }, [tab.pptxSrc]);

  useEffect(() => {
    setSlideIndex(0);
    setSlideCount(0);
    setError(null);
    setLoaded(false);
    setSizeMode('fit');
    setZoomScale(1);
  }, [tab.id, tab.pptxSrc]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return undefined;

    const update = () => {
      const rect = el.getBoundingClientRect();
      setViewportSize({ w: rect.width, h: rect.height });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [tab.pptxSrc]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !buffer) return undefined;

    let cancelled = false;
    const viewer = new PPTXViewer({
      canvas,
      slideSizeMode: 'fit',
      backgroundColor: 'transparent',
    });
    viewerRef.current = viewer;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        await viewer.loadFile(buffer);
        if (cancelled) return;
        setSlideCount(viewer.getSlideCount());
        setSlideIndex(viewer.getCurrentSlideIndex());
        setLoaded(true);
      } catch (e) {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : String(e);
        setError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    const onSlideChanged = (index: unknown) => {
      if (typeof index === 'number') setSlideIndex(index);
    };
    viewer.on('slideChanged', onSlideChanged);

    return () => {
      cancelled = true;
      viewer.off('slideChanged', onSlideChanged);
      viewer.destroy();
      viewerRef.current = null;
      setLoaded(false);
    };
  }, [buffer, tab.id]);

  useEffect(() => {
    const viewer = viewerRef.current;
    const canvas = canvasRef.current;
    if (!viewer || !canvas || !loaded || viewportSize.w <= 0) return;

    const { width, height } = computeDisplaySize(
      viewportSize.w,
      viewportSize.h,
      sizeMode,
      zoomScale,
    );
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    let cancelled = false;
    (async () => {
      try {
        await viewer.render(canvas, { slideIndex });
      } catch (e) {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : String(e);
        setError(message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loaded, slideIndex, sizeMode, zoomScale, viewportSize]);

  const goPrev = useCallback(() => {
    setSlideIndex((idx) => Math.max(0, idx - 1));
  }, []);

  const goNext = useCallback(() => {
    setSlideIndex((idx) => Math.min(slideCount - 1, idx + 1));
  }, [slideCount]);

  const zoomIn = useCallback(() => {
    setZoomScale((s) => Math.min(MAX_ZOOM, s + ZOOM_STEP));
  }, []);

  const zoomOut = useCallback(() => {
    setZoomScale((s) => Math.max(MIN_ZOOM, s - ZOOM_STEP));
  }, []);

  const fitToWindow = useCallback(() => {
    setSizeMode('fit');
    setZoomScale(1);
  }, []);

  const actualSize = useCallback(() => {
    setSizeMode('actual');
    setZoomScale(1);
  }, []);

  if (!tab.pptxSrc) {
    return (
      <div className="PptxViewerView PptxViewerView--empty">
        {tab.relativePath ? '正在加载演示文稿…' : '无法加载演示文稿'}
      </div>
    );
  }

  const name = tab.relativePath ? tabLabel(tab) : 'presentation.pptx';
  const pct = zoomPercent(viewportSize.w, viewportSize.h, sizeMode, zoomScale);
  const zoomDisabled = loading || !loaded || Boolean(error);

  return (
    <div className="PptxViewerView">
      <div className="PptxViewerView__toolbar">
        <span
          className="PptxViewerView__name"
          title={tab.relativePath ?? undefined}
        >
          {name}
        </span>
        <div className="PptxViewerView__controls">
          <div className="PptxViewerView__nav" role="group" aria-label="幻灯片导航">
            <button
              type="button"
              onClick={goPrev}
              disabled={loading || slideIndex <= 0}
              title="上一张"
            >
              ‹
            </button>
            <span className="PptxViewerView__counter">
              {slideCount > 0 ? `${slideIndex + 1} / ${slideCount}` : '—'}
            </span>
            <button
              type="button"
              onClick={goNext}
              disabled={loading || slideIndex >= slideCount - 1}
              title="下一张"
            >
              ›
            </button>
          </div>
          <div className="PptxViewerView__zoom" role="group" aria-label="缩放">
            <button
              type="button"
              onClick={zoomOut}
              disabled={zoomDisabled}
              title="缩小"
              aria-label="缩小"
            >
              −
            </button>
            <button
              type="button"
              className="PptxViewerView__zoomLevel"
              onClick={fitToWindow}
              disabled={zoomDisabled}
              title="适应窗口"
              aria-label={`当前缩放 ${pct}%，点击适应窗口`}
            >
              {pct}%
            </button>
            <button
              type="button"
              onClick={zoomIn}
              disabled={zoomDisabled}
              title="放大"
              aria-label="放大"
            >
              +
            </button>
            <button
              type="button"
              className="PptxViewerView__actualSize"
              onClick={actualSize}
              disabled={zoomDisabled}
              title="原始大小 (100%)"
            >
              原始大小
            </button>
          </div>
        </div>
      </div>
      <div ref={viewportRef} className="PptxViewerView__viewport">
        {error ? (
          <div className="PptxViewerView__error" role="alert">
            无法渲染演示文稿：{error}
          </div>
        ) : (
          <div className="PptxViewerView__stage">
            <canvas ref={canvasRef} className="PptxViewerView__canvas" />
          </div>
        )}
        {loading ? (
          <div className="PptxViewerView__loading">加载中…</div>
        ) : null}
      </div>
    </div>
  );
}
