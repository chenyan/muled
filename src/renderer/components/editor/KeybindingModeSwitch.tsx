import type { EditorMode } from '../../../shared/types/config';

interface KeybindingModeSwitchProps {
  mode: EditorMode;
  disabled: boolean;
  onChange: (mode: EditorMode) => void;
}

export default function KeybindingModeSwitch({
  mode,
  disabled,
  onChange,
}: KeybindingModeSwitchProps) {
  return (
    <div className="EditorViewSwitch" role="group" aria-label="键位模式">
      <button
        type="button"
        className={`EditorViewSwitch__btn${mode === 'normal' ? ' EditorViewSwitch__btn--active' : ''}`}
        disabled={disabled}
        onClick={() => onChange('normal')}
      >
        Normal
      </button>
      <button
        type="button"
        className={`EditorViewSwitch__btn${mode === 'vim' ? ' EditorViewSwitch__btn--active' : ''}`}
        disabled={disabled}
        onClick={() => onChange('vim')}
      >
        Vim
      </button>
    </div>
  );
}
