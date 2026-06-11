import {
  createContext,
  useCallback,
  useMemo,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { usePan } from '@embedpdf/plugin-pan/react';
import { useScroll, useScrollCapability } from '@embedpdf/plugin-scroll/react';
import { useSelectionCapability } from '@embedpdf/plugin-selection/react';
import {
  useViewportCapability,
  useViewportElement,
} from '@embedpdf/plugin-viewport/react';
import { buildPdfMnoteLoc } from '../../../lib/pdfMnoteLocator';
import { getPdfSelectionSentence } from '../../../lib/pdfGetSelectionSentence';
import { pdfSelectionToClientRect } from '../../../lib/pdfSelectionAnchorRect';
import PdfContextMenu from './PdfContextMenu';
import { hasPdfTextSelection } from './pdfSelection';

export interface PdfTranslateRequest {
  sentence: string;
  anchorRect: DOMRect;
}

export interface PdfRecordNoteRequest {
  quote: string;
  loc: string;
  anchorRect: DOMRect;
  menuX: number;
  menuY: number;
}

interface PdfContextMenuHostProps {
  documentId: string;
  hasApiKey: boolean;
  onTranslate: (request: PdfTranslateRequest) => void;
  onRecordNote?: (request: PdfRecordNoteRequest) => void;
  onCopySelectionToOtherPane?: (text: string) => void;
  children: ReactNode;
}

export const PdfContextMenuContext = createContext<{
  onContextMenu: ((event: MouseEvent) => void) | null;
}>({ onContextMenu: null });

export default function PdfContextMenuHost({
  documentId,
  hasApiKey,
  onTranslate,
  onRecordNote,
  onCopySelectionToOtherPane,
  children,
}: PdfContextMenuHostProps) {
  const { provides: selectionCap } = useSelectionCapability();
  const { provides: scrollCap } = useScrollCapability();
  const { state: scrollState } = useScroll(documentId);
  const { provides: viewportCap } = useViewportCapability();
  const viewportRef = useViewportElement();
  const { isPanning } = usePan(documentId);
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    canCopy: boolean;
    canTranslate: boolean;
  } | null>(null);

  const handleContextMenu = useCallback(
    (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const hasSelection = hasPdfTextSelection(selectionCap, documentId);
      setMenu({
        x: event.clientX,
        y: event.clientY,
        canCopy: hasSelection,
        canTranslate: hasSelection,
      });
    },
    [documentId, selectionCap],
  );

  const handleCopy = useCallback(() => {
    selectionCap?.forDocument(documentId).copyToClipboard();
    setMenu(null);
  }, [documentId, selectionCap]);

  const handleCopyToOtherPane = useCallback(async () => {
    if (!onCopySelectionToOtherPane) return;
    setMenu(null);

    const scope = selectionCap?.forDocument(documentId);
    if (!scope) return;

    const text = await getPdfSelectionSentence(scope);
    if (!text) return;

    onCopySelectionToOtherPane(text);
  }, [documentId, onCopySelectionToOtherPane, selectionCap]);

  const handleRecordNote = useCallback(async () => {
    const currentMenu = menu;
    if (!currentMenu || !onRecordNote) return;
    setMenu(null);

    const scope = selectionCap?.forDocument(documentId);
    const quote = scope ? (await getPdfSelectionSentence(scope)) ?? '' : '';
    const currentPage = scrollState.currentPage || 1;
    const loc = buildPdfMnoteLoc(
      selectionCap,
      scrollCap,
      documentId,
      currentPage,
      quote || null,
    );

    const viewportEl = viewportRef?.current;
    const anchorRect =
      viewportEl && scrollCap && viewportCap && quote
        ? pdfSelectionToClientRect(
            documentId,
            selectionCap,
            scrollCap,
            viewportCap,
            viewportEl,
          )
        : null;

    onRecordNote({
      quote,
      loc,
      anchorRect:
        anchorRect ??
        new DOMRect(currentMenu.x, currentMenu.y, 0, 0),
      menuX: currentMenu.x,
      menuY: currentMenu.y,
    });
  }, [
    documentId,
    menu,
    onRecordNote,
    scrollCap,
    scrollState.currentPage,
    selectionCap,
    viewportCap,
    viewportRef,
  ]);

  const handleTranslate = useCallback(async () => {
    const currentMenu = menu;
    if (!currentMenu) return;
    setMenu(null);

    const scope = selectionCap?.forDocument(documentId);
    if (!scope) return;

    const sentence = await getPdfSelectionSentence(scope);
    if (!sentence) return;

    const viewportEl = viewportRef?.current;
    const anchorRect =
      viewportEl && scrollCap && viewportCap
        ? pdfSelectionToClientRect(
            documentId,
            selectionCap,
            scrollCap,
            viewportCap,
            viewportEl,
          )
        : null;

    onTranslate({
      sentence,
      anchorRect:
        anchorRect ??
        new DOMRect(currentMenu.x, currentMenu.y, 0, 0),
    });
  }, [
    documentId,
    menu,
    onTranslate,
    scrollCap,
    selectionCap,
    viewportCap,
    viewportRef,
  ]);

  const contextValue = useMemo(
    () => ({ onContextMenu: handleContextMenu }),
    [handleContextMenu],
  );

  return (
    <PdfContextMenuContext.Provider value={contextValue}>
      <div className="PdfPreview__contextHost PdfPreview__contextHost--inViewport">
        {children}
        {menu && (
          <PdfContextMenu
            x={menu.x}
            y={menu.y}
            canCopy={menu.canCopy}
            showTranslate={!isPanning}
            canTranslate={menu.canTranslate}
            showCopyToOtherPane={Boolean(onCopySelectionToOtherPane)}
            canCopyToOtherPane={menu.canCopy}
            hasApiKey={hasApiKey}
            onCopy={handleCopy}
            onCopyToOtherPane={() => {
              void handleCopyToOtherPane();
            }}
            onTranslate={() => {
              void handleTranslate();
            }}
            onRecordNote={() => {
              void handleRecordNote();
            }}
            onClose={() => setMenu(null)}
          />
        )}
      </div>
    </PdfContextMenuContext.Provider>
  );
}
