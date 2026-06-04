import {
  createContext,
  useCallback,
  useMemo,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { usePan } from '@embedpdf/plugin-pan/react';
import { useScrollCapability } from '@embedpdf/plugin-scroll/react';
import { useSelectionCapability } from '@embedpdf/plugin-selection/react';
import {
  useViewportCapability,
  useViewportElement,
} from '@embedpdf/plugin-viewport/react';
import { getPdfSelectionSentence } from '../../../lib/pdfGetSelectionSentence';
import { pdfSelectionToClientRect } from '../../../lib/pdfSelectionAnchorRect';
import PdfContextMenu from './PdfContextMenu';
import { hasPdfTextSelection } from './pdfSelection';

export interface PdfTranslateRequest {
  sentence: string;
  anchorRect: DOMRect;
}

interface PdfContextMenuHostProps {
  documentId: string;
  hasApiKey: boolean;
  onTranslate: (request: PdfTranslateRequest) => void;
  children: ReactNode;
}

export const PdfContextMenuContext = createContext<{
  onContextMenu: ((event: MouseEvent) => void) | null;
}>({ onContextMenu: null });

export default function PdfContextMenuHost({
  documentId,
  hasApiKey,
  onTranslate,
  children,
}: PdfContextMenuHostProps) {
  const { provides: selectionCap } = useSelectionCapability();
  const { provides: scrollCap } = useScrollCapability();
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
            hasApiKey={hasApiKey}
            onCopy={handleCopy}
            onTranslate={() => {
              void handleTranslate();
            }}
            onClose={() => setMenu(null)}
          />
        )}
      </div>
    </PdfContextMenuContext.Provider>
  );
}
