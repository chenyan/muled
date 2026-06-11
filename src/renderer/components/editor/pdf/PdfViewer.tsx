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
import type {
  PdfRecordNoteRequest,
  PdfTranslateRequest,
} from './PdfContextMenuHost';
import PdfPageToolbar from './PdfPageToolbar';
import PdfToolModeToolbar from './PdfToolModeToolbar';
import PdfMnotePageHighlight from './PdfMnotePageHighlight';
import PdfMnoteScrollEffect from './PdfMnoteScrollEffect';
import PdfPageSyncListener from './PdfPageSyncListener';
import PdfScrollRestoreEffect from './PdfScrollRestoreEffect';
import PdfViewportShell from './PdfViewportShell';
import PdfZoomToolbar from './PdfZoomToolbar';

interface PdfViewerProps {
  tab: EditorTab;
  hasApiKey: boolean;
  onTranslate: (request: PdfTranslateRequest) => void;
  onRecordNote?: (request: PdfRecordNoteRequest) => void;
  onCopySelectionToOtherPane?: (text: string) => void;
  onPdfPageChange?: (page: number) => void;
}

export default function PdfViewer({
  tab,
  hasApiKey,
  onTranslate,
  onRecordNote,
  onCopySelectionToOtherPane,
  onPdfPageChange,
}: PdfViewerProps) {
  const { engine, isLoading, error } = usePdfEngine();
  const pdfBuffer = tab.pdfBuffer;
  const name = tab.relativePath ? tabLabel(tab) : 'document.pdf';

  const plugins = useMemo(() => {
    if (!pdfBuffer) return [];
    return [
      createPluginRegistration(DocumentManagerPluginPackage, {
        initialDocuments: [{ buffer: pdfBuffer, name }],
      }),
      createPluginRegistration(InteractionManagerPluginPackage),
      createPluginRegistration(ViewportPluginPackage),
      createPluginRegistration(ScrollPluginPackage, {
        // 首屏仅渲染可见页 + 1 页缓冲，加快首页出现
        defaultBufferSize: 1,
      }),
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
  }, [pdfBuffer, name]);

  if (!pdfBuffer) {
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
        <EmbedPDF key={tab.id} engine={engine} plugins={plugins}>
          {({ activeDocumentId }) =>
            activeDocumentId ? (
              <div className="PdfPreview__embed">
                <div className="PdfPreview__toolbar">
                  <PdfToolModeToolbar documentId={activeDocumentId} />
                  <span className="PdfPreview__toolbarSep" aria-hidden />
                  <PdfPageToolbar documentId={activeDocumentId} />
                  <span className="PdfPreview__toolbarSep" aria-hidden />
                  <PdfZoomToolbar documentId={activeDocumentId} />
                </div>
                <div className="PdfPreview__documentArea">
                  <DocumentContent documentId={activeDocumentId}>
                    {({ isLoaded }) =>
                      isLoaded && (
                        <PdfViewportShell
                          documentId={activeDocumentId}
                          hasApiKey={hasApiKey}
                          onTranslate={onTranslate}
                          onRecordNote={onRecordNote}
                          onCopySelectionToOtherPane={onCopySelectionToOtherPane}
                        >
                          <PdfPageSyncListener
                            documentId={activeDocumentId}
                            onPageChange={onPdfPageChange}
                          />
                          <PdfMnoteScrollEffect
                            documentId={activeDocumentId}
                            reveal={tab.pdfReveal}
                          />
                          {!tab.pdfReveal && tab.pdfLastPage ? (
                            <PdfScrollRestoreEffect
                              documentId={activeDocumentId}
                              page={tab.pdfLastPage}
                            />
                          ) : null}
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
                                  dpr={1}
                                />
                                <SelectionLayer
                                  documentId={activeDocumentId}
                                  pageIndex={pageIndex}
                                />
                                <PdfMnotePageHighlight
                                  pageIndex={pageIndex}
                                  reveal={tab.pdfReveal}
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
