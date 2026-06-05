import { useEffect, useRef } from 'react';
import './PdfContextMenu.css';

interface PdfContextMenuProps {
  x: number;
  y: number;
  canCopy: boolean;
  showTranslate: boolean;
  canTranslate: boolean;
  showCopyToOtherPane: boolean;
  canCopyToOtherPane: boolean;
  hasApiKey: boolean;
  onCopy: () => void;
  onCopyToOtherPane: () => void;
  onTranslate: () => void;
  onClose: () => void;
}

export default function PdfContextMenu({
  x,
  y,
  canCopy,
  showTranslate,
  canTranslate,
  showCopyToOtherPane,
  canCopyToOtherPane,
  hasApiKey,
  onCopy,
  onCopyToOtherPane,
  onTranslate,
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

  const translateDisabled = !canTranslate || !hasApiKey;
  const translateTitle = (() => {
    if (!canTranslate) return '请先选中文字';
    if (!hasApiKey) return '未配置 OpenAI API Key';
    return undefined;
  })();

  return (
    <div
      ref={menuRef}
      className="PdfContextMenu"
      style={{ left: x, top: y }}
      role="menu"
    >
      {showTranslate && (
        <button
          type="button"
          role="menuitem"
          className="PdfContextMenu__item"
          disabled={translateDisabled}
          title={translateTitle}
          onClick={onTranslate}
        >
          翻译该句
        </button>
      )}
      {showTranslate && (
        <div className="PdfContextMenu__separator" role="separator" />
      )}
      {showCopyToOtherPane && (
        <button
          type="button"
          role="menuitem"
          className="PdfContextMenu__item"
          disabled={!canCopyToOtherPane}
          title={canCopyToOtherPane ? undefined : '请先选中文字'}
          onClick={onCopyToOtherPane}
        >
          复制到另一侧
        </button>
      )}
      <button
        type="button"
        role="menuitem"
        className="PdfContextMenu__item"
        disabled={!canCopy}
        title={canCopy ? undefined : '请先选中文字'}
        onClick={onCopy}
      >
        复制
      </button>
    </div>
  );
}
