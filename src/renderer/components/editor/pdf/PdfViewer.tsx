import { useMemo } from 'react';
import { createPluginRegistration } from '@embedpdf/core';
import { EmbedPDF } from '@embedpdf/core/react';
import {
  DocumentContent,
  DocumentManagerPluginPackage,
} from '@embedpdf/plugin-document-manager/react';
import { RenderLayer, RenderPluginPackage } from '@embedpdf/plugin-render/react';
import { Scroller, ScrollPluginPackage } from '@embedpdf/plugin-scroll/react';
import { Viewport, ViewportPluginPackage } from '@embedpdf/plugin-viewport/react';
import {
  InteractionManagerPluginPackage,
  PagePointerProvider,
} from '@embedpdf/plugin-interaction-manager/react';
import { PanPluginPackage } from '@embedpdf/plugin-pan';
import { SelectionLayer, SelectionPluginPackage } from '@embedpdf/plugin-selection/react';
import {
  ZoomMode,
  ZoomPluginPackage,
} from '@embedpdf/plugin-zoom/react';
import type { EditorTab } from '../../../types/tab';
import { tabLabel } from '../../../types/tab';
import { usePdfEngine } from './PdfEngineProvider';
import type { PdfTranslateRequest } from './PdfContextMenuHost';
import PdfToolModeToolbar from './PdfToolModeToolbar';
import PdfViewportShell from './PdfViewportShell';
import PdfZoomToolbar from './PdfZoomToolbar';

interface PdfViewerProps {
  tab: EditorTab;
  hasApiKey: boolean;
  onTranslate: (request: PdfTranslateRequest) => void;
  onCopySelectionToOtherPane?: (text: string) => void;
}

export default function PdfViewer({
  tab,
  hasApiKey,
  onTranslate,
  onCopySelectionToOtherPane,
}: PdfViewerProps) {
  const { engine, isLoading, error } = usePdfEngine();
  const pdfSrc = tab.pdfSrc;
  const name = tab.relativePath ? tabLabel(tab) : 'document.pdf';

  const plugins = useMemo(() => {
    if (!pdfSrc) return [];
    return [
      createPluginRegistration(DocumentManagerPluginPackage, {
        initialDocuments: [{ url: pdfSrc, name }],
      }),
      createPluginRegistration(InteractionManagerPluginPackage),
      createPluginRegistration(ViewportPluginPackage),
      createPluginRegistration(ScrollPluginPackage),
      createPluginRegistration(RenderPluginPackage),
      createPluginRegistration(SelectionPluginPackage, {
        marquee: { enabled: false },
        minSelectionDragDistance: 2,
      }),
      createPluginRegistration(PanPluginPackage, { defaultMode: 'never' }),
      createPluginRegistration(ZoomPluginPackage, {
        defaultZoomLevel: ZoomMode.FitWidth,
      }),
    ];
  }, [pdfSrc, name]);

  if (!pdfSrc) {
    return (
      <div className="PdfPreview PdfPreview--loading">
        {tab.relativePath ? '正在加载 PDF…' : '无法加载 PDF'}
      </div>
    );
  }

  if (error) {
    return (
      <div className="PdfPreview PdfPreview--empty" role="alert">
        PDF 引擎加载失败：{error.message}
      </div>
    );
  }

  if (isLoading || !engine) {
    return (
      <div className="PdfPreview PdfPreview--loading">正在加载 PDF 引擎…</div>
    );
  }

  return (
    <div className="PdfPreview">
      <div className="PdfPreview__viewport">
        <EmbedPDF key={pdfSrc} engine={engine} plugins={plugins}>
          {({ activeDocumentId }) =>
            activeDocumentId ? (
              <div className="PdfPreview__embed">
                <div className="PdfPreview__toolbar">
                  <span
                    className="PdfPreview__name"
                    title={tab.relativePath ?? undefined}
                  >
                    {name}
                  </span>
                  <div className="PdfPreview__toolbarRight">
                    <PdfToolModeToolbar documentId={activeDocumentId} />
                    <span className="PdfPreview__toolbarSep" aria-hidden />
                    <PdfZoomToolbar documentId={activeDocumentId} />
                  </div>
                </div>
                <div className="PdfPreview__documentArea">
                  <DocumentContent documentId={activeDocumentId}>
                    {({ isLoaded }) =>
                      isLoaded && (
                        <PdfViewportShell
                          documentId={activeDocumentId}
                          hasApiKey={hasApiKey}
                          onTranslate={onTranslate}
                          onCopySelectionToOtherPane={onCopySelectionToOtherPane}
                        >
                          <Scroller
                            documentId={activeDocumentId}
                            renderPage={({ pageIndex }) => (
                              <PagePointerProvider
                                documentId={activeDocumentId}
                                pageIndex={pageIndex}
                              >
                                <RenderLayer
                                  documentId={activeDocumentId}
                                  pageIndex={pageIndex}
                                />
                                <SelectionLayer
                                  documentId={activeDocumentId}
                                  pageIndex={pageIndex}
                                />
                              </PagePointerProvider>
                            )}
                          />
                        </PdfViewportShell>
                      )
                    }
                  </DocumentContent>
                </div>
              </div>
            ) : (
              <div className="PdfPreview PdfPreview--loading">正在打开文档…</div>
            )
          }
        </EmbedPDF>
      </div>
    </div>
  );
}
