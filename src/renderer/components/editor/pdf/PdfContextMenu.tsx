import { useEffect, useRef } from 'react';
import './PdfContextMenu.css';

interface PdfContextMenuProps {
  x: number;
  y: number;
  canCopy: boolean;
  onCopy: () => void;
  onClose: () => void;
}

export default function PdfContextMenu({
  x,
  y,
  canCopy,
  onCopy,
  onClose,
}: PdfContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="PdfContextMenu"
      style={{ left: x, top: y }}
      role="menu"
    >
      <button
        type="button"
        role="menuitem"
        className="PdfContextMenu__item"
        disabled={!canCopy}
        onClick={onCopy}
      >
        复制
      </button>
    </div>
  );
}
