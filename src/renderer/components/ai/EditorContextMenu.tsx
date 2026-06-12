import { useEffect, useRef } from 'react';
import './EditorContextMenu.css';

export type EditorContextMenuAction =
  | 'append'
  | 'replace'
  | 'translate'
  | 'recordNote';

export interface EditorContextMenuProps {
  open: boolean;
  x: number;
  y: number;
  hasSelection: boolean;
  hasApiKey: boolean;
  showTranslate?: boolean;
  showAiEdit?: boolean;
  showRecordNote?: boolean;
  onSelect: (action: EditorContextMenuAction) => void;
  onClose: () => void;
}

export default function EditorContextMenu({
  open,
  x,
  y,
  hasSelection,
  hasApiKey,
  showTranslate = false,
  showAiEdit = true,
  showRecordNote = false,
  onSelect,
  onClose,
}: EditorContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onPointerDown = (e: MouseEvent) => {
      const el = menuRef.current;
      if (el && !el.contains(e.target as Node)) {
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('mousedown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('mousedown', onPointerDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const appendDisabled = !hasApiKey;
  const replaceDisabled = !hasSelection || !hasApiKey;
  const translateDisabled = !hasSelection || !hasApiKey;
  const appendTitle = !hasApiKey ? '未配置 OpenAI API Key' : undefined;
  const replaceTitle = (() => {
    if (!hasSelection) return '请先选中文字';
    if (!hasApiKey) return '未配置 OpenAI API Key';
    return undefined;
  })();
  const translateTitle = replaceTitle;

  return (
    <div
      ref={menuRef}
      className="EditorContextMenu"
      style={{ left: x, top: y }}
      role="menu"
    >
      {showTranslate && (
        <button
          type="button"
          role="menuitem"
          className="EditorContextMenu__item"
          disabled={translateDisabled}
          title={translateTitle}
          onClick={() => onSelect('translate')}
        >
          翻译该句
        </button>
      )}
      {showTranslate && showAiEdit && (
        <div className="EditorContextMenu__separator" role="separator" />
      )}
      {showAiEdit && (
        <>
          <button
            type="button"
            role="menuitem"
            className="EditorContextMenu__item"
            disabled={appendDisabled}
            title={appendTitle}
            onClick={() => onSelect('append')}
          >
            Chat Append
          </button>
          <button
            type="button"
            role="menuitem"
            className="EditorContextMenu__item"
            disabled={replaceDisabled}
            title={replaceTitle}
            onClick={() => onSelect('replace')}
          >
            Chat Replace
          </button>
        </>
      )}
      {showRecordNote && (showTranslate || showAiEdit) && (
        <div className="EditorContextMenu__separator" role="separator" />
      )}
      {showRecordNote && (
        <button
          type="button"
          role="menuitem"
          className="EditorContextMenu__item"
          onClick={() => onSelect('recordNote')}
        >
          记录笔记
        </button>
      )}
    </div>
  );
}
