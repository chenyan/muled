import type { EditorViewMode } from '../../../shared/types/config';

interface EditorViewSwitchProps {
  viewMode: EditorViewMode;
  disabled: boolean;
  onChange: (mode: EditorViewMode) => void;
}

export default function EditorViewSwitch({
  viewMode,
  disabled,
  onChange,
}: EditorViewSwitchProps) {
  return (
    <div className="EditorViewSwitch" role="group" aria-label="编辑器视图">
      <button
        type="button"
        className={`EditorViewSwitch__btn${viewMode === 'rich-text' ? ' EditorViewSwitch__btn--active' : ''}`}
        disabled={disabled}
        onClick={() => onChange('rich-text')}
      >
        WYSIWYG
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
