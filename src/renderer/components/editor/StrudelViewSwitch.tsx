import type { EditorViewMode } from '../../../shared/types/config';

interface StrudelViewSwitchProps {
  viewMode: EditorViewMode;
  disabled: boolean;
  onChange: (mode: EditorViewMode) => void;
}

export default function StrudelViewSwitch({
  viewMode,
  disabled,
  onChange,
}: StrudelViewSwitchProps) {
  return (
    <div className="EditorViewSwitch" role="group" aria-label="Strudel 视图">
      <button
        type="button"
        className={`EditorViewSwitch__btn${viewMode === 'preview' ? ' EditorViewSwitch__btn--active' : ''}`}
        disabled={disabled}
        onClick={() => onChange('preview')}
      >
        REPL
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
