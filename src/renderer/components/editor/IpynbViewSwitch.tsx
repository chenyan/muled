import type { EditorViewMode } from '../../../shared/types/config';

interface IpynbViewSwitchProps {
  viewMode: EditorViewMode;
  disabled: boolean;
  onChange: (mode: EditorViewMode) => void;
}

export default function IpynbViewSwitch({
  viewMode,
  disabled,
  onChange,
}: IpynbViewSwitchProps) {
  return (
    <div className="EditorViewSwitch" role="group" aria-label="Notebook 视图">
      <button
        type="button"
        className={`EditorViewSwitch__btn${viewMode === 'notebook' ? ' EditorViewSwitch__btn--active' : ''}`}
        disabled={disabled}
        onClick={() => onChange('notebook')}
      >
        Notebook
      </button>
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
