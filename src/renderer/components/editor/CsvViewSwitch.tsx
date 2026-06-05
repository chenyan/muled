import type { EditorViewMode } from '../../../shared/types/config';

interface CsvViewSwitchProps {
  viewMode: EditorViewMode;
  disabled: boolean;
  onChange: (mode: EditorViewMode) => void;
}

export default function CsvViewSwitch({
  viewMode,
  disabled,
  onChange,
}: CsvViewSwitchProps) {
  return (
    <div className="EditorViewSwitch" role="group" aria-label="CSV 视图">
      <button
        type="button"
        className={`EditorViewSwitch__btn${viewMode === 'preview' ? ' EditorViewSwitch__btn--active' : ''}`}
        disabled={disabled}
        onClick={() => onChange('preview')}
      >
        表格
      </button>
      <button
        type="button"
        className={`EditorViewSwitch__btn${viewMode === 'source' ? ' EditorViewSwitch__btn--active' : ''}`}
        disabled={disabled}
        onClick={() => onChange('source')}
      >
        源码
      </button>
    </div>
  );
}
