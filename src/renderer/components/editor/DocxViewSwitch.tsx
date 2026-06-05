import type { EditorViewMode } from '../../../shared/types/config';

interface DocxViewSwitchProps {
  viewMode: EditorViewMode;
  disabled: boolean;
  onChange: (mode: EditorViewMode) => void;
}

export default function DocxViewSwitch({
  viewMode,
  disabled,
  onChange,
}: DocxViewSwitchProps) {
  return (
    <div className="EditorViewSwitch" role="group" aria-label="DOCX 视图">
      <button
        type="button"
        className={`EditorViewSwitch__btn${viewMode === 'rich-text' ? ' EditorViewSwitch__btn--active' : ''}`}
        disabled={disabled}
        onClick={() => onChange('rich-text')}
      >
        编辑
      </button>
      <button
        type="button"
        className={`EditorViewSwitch__btn${viewMode === 'preview' ? ' EditorViewSwitch__btn--active' : ''}`}
        disabled={disabled}
        onClick={() => onChange('preview')}
      >
        预览
      </button>
    </div>
  );
}
