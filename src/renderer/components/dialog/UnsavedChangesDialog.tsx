import { useEffect } from 'react';
import {
  canSaveDirtyTab,
  unsavedDialogMessage,
  unsavedDialogTitle,
} from '../../lib/unsavedChanges';
import type { EditorTab } from '../../types/tab';
import './UnsavedChangesDialog.css';

export interface UnsavedChangesDialogProps {
  tab: EditorTab | null;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

export default function UnsavedChangesDialog({
  tab,
  onSave,
  onDiscard,
  onCancel,
}: UnsavedChangesDialogProps) {
  useEffect(() => {
    if (!tab) return undefined;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [tab, onCancel]);

  if (!tab) return null;

  const saveEnabled = canSaveDirtyTab(tab);

  return (
    <div
      className="UnsavedChangesDialog__backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="UnsavedChangesDialog"
        role="alertdialog"
        aria-labelledby="unsaved-dialog-title"
        aria-describedby="unsaved-dialog-desc"
      >
        <header className="UnsavedChangesDialog__header">
          <h2 id="unsaved-dialog-title" className="UnsavedChangesDialog__title">
            {unsavedDialogTitle(tab)}
          </h2>
        </header>
        <p id="unsaved-dialog-desc" className="UnsavedChangesDialog__body">
          {unsavedDialogMessage(tab)}
        </p>
        <footer className="UnsavedChangesDialog__footer">
          <button
            type="button"
            className="UnsavedChangesDialog__btn"
            onClick={onCancel}
          >
            取消
          </button>
          <button
            type="button"
            className="UnsavedChangesDialog__btn UnsavedChangesDialog__btn--danger"
            onClick={onDiscard}
          >
            不保存
          </button>
          <button
            type="button"
            className="UnsavedChangesDialog__btn UnsavedChangesDialog__btn--primary"
            disabled={!saveEnabled}
            title={saveEnabled ? undefined : '当前内容无法保存到磁盘'}
            onClick={onSave}
          >
            保存
          </button>
        </footer>
      </div>
    </div>
  );
}
