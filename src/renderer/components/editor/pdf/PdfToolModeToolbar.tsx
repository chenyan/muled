import { useCallback } from 'react';
import { useInteractionManager } from '@embedpdf/plugin-interaction-manager/react';
import { usePan } from '@embedpdf/plugin-pan/react';
import { useSelectionCapability } from '@embedpdf/plugin-selection/react';

export type PdfToolMode = 'select' | 'pan';

interface PdfToolModeToolbarProps {
  documentId: string;
}

export default function PdfToolModeToolbar({
  documentId,
}: PdfToolModeToolbarProps) {
  const { isPanning, provides: pan } = usePan(documentId);
  const { provides: interaction } = useInteractionManager(documentId);
  const { provides: selectionCap } = useSelectionCapability();

  const mode: PdfToolMode = isPanning ? 'pan' : 'select';

  const selectText = useCallback(() => {
    pan?.disablePan();
    interaction?.activate('pointerMode');
  }, [interaction, pan]);

  const selectPan = useCallback(() => {
    selectionCap?.forDocument(documentId).clear();
    pan?.enablePan();
  }, [documentId, pan, selectionCap]);

  const disabled = !pan;

  return (
    <div className="PdfPreview__tools" role="group" aria-label="交互工具">
      <button
        type="button"
        className={`PdfPreview__toolBtn${mode === 'select' ? ' PdfPreview__toolBtn--active' : ''}`}
        onClick={selectText}
        disabled={disabled}
        aria-pressed={mode === 'select'}
        title="文本选择"
      >
        选择
      </button>
      <button
        type="button"
        className={`PdfPreview__toolBtn${mode === 'pan' ? ' PdfPreview__toolBtn--active' : ''}`}
        onClick={selectPan}
        disabled={disabled}
        aria-pressed={mode === 'pan'}
        title="手型平移"
      >
        手型
      </button>
    </div>
  );
}
