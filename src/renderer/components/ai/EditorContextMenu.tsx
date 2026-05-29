import { useEffect, useRef } from 'react';
import './EditorContextMenu.css';

export type EditorContextMenuAction = 'append' | 'replace';

export interface EditorContextMenuProps {
  open: boolean;
  x: number;
  y: number;
  hasSelection: boolean;
  hasApiKey: boolean;
  onSelect: (action: EditorContextMenuAction) => void;
  onClose: () => void;
}

export default function EditorContextMenu({
  open,
  x,
  y,
  hasSelection,
  hasApiKey,
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

  const aiDisabled = !hasSelection || !hasApiKey;
  const aiTitle = (() => {
    if (!hasSelection) return '请先选中文字';
    if (!hasApiKey) return '未配置 OpenAI API Key';
    return undefined;
  })();

  return (
    <div
      ref={menuRef}
      className="EditorContextMenu"
      style={{ left: x, top: y }}
      role="menu"
    >
      <button
        type="button"
        role="menuitem"
        className="EditorContextMenu__item"
        disabled={aiDisabled}
        title={aiTitle}
        onClick={() => onSelect('append')}
      >
        Chat Append
      </button>
      <button
        type="button"
        role="menuitem"
        className="EditorContextMenu__item"
        disabled={aiDisabled}
        title={aiTitle}
        onClick={() => onSelect('replace')}
      >
        Chat Replace
      </button>
    </div>
  );
}
