import type { EditorViewMode } from '../../../shared/types/config';

interface OrgViewSwitchProps {
  viewMode: EditorViewMode;
  disabled: boolean;
  onChange: (mode: EditorViewMode) => void;
}

export default function OrgViewSwitch({
  viewMode,
  disabled,
  onChange,
}: OrgViewSwitchProps) {
  return (
    <div className="EditorViewSwitch" role="group" aria-label="Org 视图">
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
        className={`EditorViewSwitch__btn${viewMode === 'agenda' ? ' EditorViewSwitch__btn--active' : ''}`}
        disabled={disabled}
        onClick={() => onChange('agenda')}
      >
        Agenda
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
