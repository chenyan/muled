import type { EditorViewMode } from '../../../shared/types/config';

interface MermaidViewSwitchProps {
  viewMode: EditorViewMode;
  disabled: boolean;
  onChange: (mode: EditorViewMode) => void;
}

export default function MermaidViewSwitch({
  viewMode,
  disabled,
  onChange,
}: MermaidViewSwitchProps) {
  return (
    <div className="EditorViewSwitch" role="group" aria-label="Mermaid 视图">
      <button
        type="button"
        className={`EditorViewSwitch__btn${viewMode === 'preview' ? ' EditorViewSwitch__btn--active' : ''}`}
        disabled={disabled}
        onClick={() => onChange('preview')}
      >
        Preview
      </button>
      <button
        type="button"
        className={`EditorViewSwitch__btn${viewMode === 'source' ? ' EditorViewSwitch__btn--active' : ''}`}
        disabled={disabled}
        onClick={() => onChange('source')}
      >
        Source
      </button>
    </div>
  );
}
