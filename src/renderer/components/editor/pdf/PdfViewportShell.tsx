import { useCallback, useEffect, useLayoutEffect } from 'react';
import type { ReactNode } from 'react';
import {
  GlobalPointerProvider,
  useInteractionManager,
} from '@embedpdf/plugin-interaction-manager/react';
import { usePan } from '@embedpdf/plugin-pan/react';
import { Viewport, useViewportElement } from '@embedpdf/plugin-viewport/react';
import PdfContextMenuHost, {
  type PdfTranslateRequest,
} from './PdfContextMenuHost';
import PdfViewportContextMenuListener from './PdfViewportContextMenuListener';

interface PdfViewportShellProps {
  documentId: string;
  hasApiKey: boolean;
  onTranslate: (request: PdfTranslateRequest) => void;
  onCopySelectionToOtherPane?: (text: string) => void;
  children: ReactNode;
}

function PdfSelectViewportScrollGuard() {
  const viewportRef = useViewportElement();

  useLayoutEffect(() => {
    const viewport = viewportRef?.current;
    if (!viewport) return undefined;

    const blockDragScroll = (event: Event) => {
      if (event.type === 'pointermove' && (event as PointerEvent).buttons === 0) {
        return;
      }
      if (event.type === 'pointerdown' && (event as PointerEvent).button !== 0) {
        return;
      }
      event.preventDefault();
    };

    viewport.addEventListener('pointerdown', blockDragScroll, { capture: true });
    viewport.addEventListener('pointermove', blockDragScroll, { capture: true });
    viewport.addEventListener('dragstart', blockDragScroll, { capture: true });

    return () => {
      viewport.removeEventListener('pointerdown', blockDragScroll, { capture: true });
      viewport.removeEventListener('pointermove', blockDragScroll, { capture: true });
      viewport.removeEventListener('dragstart', blockDragScroll, { capture: true });
    };
  }, [viewportRef]);

  return null;
}

/**
 * 选择 / 手型分离：选择模式不挂载 GlobalPointerProvider，并禁用 Viewport 拖动手势滚动；
 * 手型模式才启用全局指针与原生滚动（由 Pan 插件接管拖移）。
 */
export default function PdfViewportShell({
  documentId,
  hasApiKey,
  onTranslate,
  onCopySelectionToOtherPane,
  children,
}: PdfViewportShellProps) {
  const { isPanning } = usePan(documentId);
  const { provides: interaction } = useInteractionManager(documentId);

  const applySelectMode = useCallback(() => {
    interaction?.activate('pointerMode');
  }, [interaction]);

  useEffect(() => {
    if (isPanning) return;
    applySelectMode();
  }, [applySelectMode, isPanning]);

  const viewportClassName = isPanning
    ? 'PdfPreview__viewportSurface PdfPreview__viewportSurface--pan'
    : 'PdfPreview__viewportSurface PdfPreview__viewportSurface--select';

  if (isPanning) {
    return (
      <GlobalPointerProvider documentId={documentId}>
        <Viewport
          documentId={documentId}
          className={viewportClassName}
          style={{ backgroundColor: 'var(--pdf-viewport-bg, #f1f3f5)' }}
        >
          <PdfContextMenuHost
            documentId={documentId}
            hasApiKey={hasApiKey}
            onTranslate={onTranslate}
            onCopySelectionToOtherPane={onCopySelectionToOtherPane}
          >
            <PdfViewportContextMenuListener />
            {children}
          </PdfContextMenuHost>
        </Viewport>
      </GlobalPointerProvider>
    );
  }

  return (
    <Viewport
      documentId={documentId}
      className={viewportClassName}
      style={{ backgroundColor: 'var(--pdf-viewport-bg, #f1f3f5)' }}
    >
      <PdfContextMenuHost
        documentId={documentId}
        hasApiKey={hasApiKey}
        onTranslate={onTranslate}
        onCopySelectionToOtherPane={onCopySelectionToOtherPane}
      >
        <PdfViewportContextMenuListener />
        <PdfSelectViewportScrollGuard />
        {children}
      </PdfContextMenuHost>
    </Viewport>
  );
}
