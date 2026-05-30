import {
  createContext,
  useCallback,
  useMemo,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { useSelectionCapability } from '@embedpdf/plugin-selection/react';
import PdfContextMenu from './PdfContextMenu';
import { hasPdfTextSelection } from './pdfSelection';

interface PdfContextMenuHostProps {
  documentId: string;
  children: ReactNode;
}

export const PdfContextMenuContext = createContext<{
  onContextMenu: ((event: MouseEvent) => void) | null;
}>({ onContextMenu: null });

export default function PdfContextMenuHost({
  documentId,
  children,
}: PdfContextMenuHostProps) {
  const { provides: selectionCap } = useSelectionCapability();
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    canCopy: boolean;
  } | null>(null);

  const handleContextMenu = useCallback(
    (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const canCopy = hasPdfTextSelection(selectionCap, documentId);
      setMenu({ x: event.clientX, y: event.clientY, canCopy });
    },
    [documentId, selectionCap],
  );

  const handleCopy = useCallback(() => {
    selectionCap?.forDocument(documentId).copyToClipboard();
    setMenu(null);
  }, [documentId, selectionCap]);

  const contextValue = useMemo(
    () => ({ onContextMenu: handleContextMenu }),
    [handleContextMenu],
  );

  return (
    <PdfContextMenuContext.Provider value={contextValue}>
      <div className="PdfPreview__contextHost">
        {children}
        {menu && (
          <PdfContextMenu
            x={menu.x}
            y={menu.y}
            canCopy={menu.canCopy}
            onCopy={handleCopy}
            onClose={() => setMenu(null)}
          />
        )}
      </div>
    </PdfContextMenuContext.Provider>
  );
}
