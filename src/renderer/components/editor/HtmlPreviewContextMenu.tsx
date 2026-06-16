import { useEffect, useRef, type ReactNode } from 'react';
import FloatingContextMenuPortal from '../tree/FloatingContextMenuPortal';
import type { HtmlPreviewEncoding } from '../../lib/htmlPreviewEncodings';
import './HtmlPreviewContextMenu.css';

export type HtmlPreviewContextMenuAction =
  | { kind: 'encoding'; encodingId: string }
  | { kind: 'copy' }
  | { kind: 'translate' }
  | { kind: 'note' };

interface HtmlPreviewContextMenuProps {
  x: number;
  y: number;
  encoding: string;
  encodings: readonly HtmlPreviewEncoding[];
  encodingDisabled?: boolean;
  hasSelection: boolean;
  hasApiKey: boolean;
  showNote?: boolean;
  onSelect: (action: HtmlPreviewContextMenuAction) => void;
  onClose: () => void;
}

function Submenu({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="HtmlPreviewContextMenu__submenu">
      <div
        className="HtmlPreviewContextMenu__submenuTrigger"
        role="menuitem"
        aria-haspopup="menu"
      >
        <span>{label}</span>
        {hint ? (
          <span className="HtmlPreviewContextMenu__hint">{hint}</span>
        ) : null}
      </div>
      <div className="HtmlPreviewContextMenu__submenuPanel" role="menu">
        {children}
      </div>
    </div>
  );
}

function MenuItem({
  label,
  disabled,
  title,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  title?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className="HtmlPreviewContextMenu__item"
      disabled={disabled}
      title={title}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export default function HtmlPreviewContextMenu({
  x,
  y,
  encoding,
  encodings,
  encodingDisabled = false,
  hasSelection,
  hasApiKey,
  showNote = false,
  onSelect,
  onClose,
}: HtmlPreviewContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const onPointerDown = (event: PointerEvent) => {
      const el = menuRef.current;
      if (el && !el.contains(event.target as Node)) {
        onClose();
      }
    };
    const onFocusIn = (event: FocusEvent) => {
      const el = menuRef.current;
      if (
        el &&
        event.target instanceof Node &&
        !el.contains(event.target)
      ) {
        onClose();
      }
    };
    const onWindowBlur = () => {
      onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('focusin', onFocusIn, true);
    window.addEventListener('blur', onWindowBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('focusin', onFocusIn, true);
      window.removeEventListener('blur', onWindowBlur);
    };
  }, [onClose]);

  const translateDisabled = !hasSelection || !hasApiKey;
  const translateTitle = (() => {
    if (!hasSelection) return '请先选中文字';
    if (!hasApiKey) return '未配置 OpenAI API Key';
    return undefined;
  })();

  return (
    <FloatingContextMenuPortal
      x={x}
      y={y}
      className="HtmlPreviewContextMenu HtmlPreviewContextMenu--floating"
      role="menu"
    >
      <div ref={menuRef}>
        <Submenu
          label="编码"
          hint={encodingDisabled ? '需保存后生效' : undefined}
        >
          {encodings.map((item) => {
            const active = item.id === encoding;
            return (
              <button
                key={item.id}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                disabled={encodingDisabled}
                title={
                  encodingDisabled ? '请先保存文件后再选择磁盘编码' : undefined
                }
                className={`HtmlPreviewContextMenu__item HtmlPreviewContextMenu__item--encoding${active ? ' HtmlPreviewContextMenu__item--active' : ''}`}
                onClick={() =>
                  onSelect({ kind: 'encoding', encodingId: item.id })
                }
              >
                <span
                  className="HtmlPreviewContextMenu__check"
                  aria-hidden="true"
                >
                  {active ? '✓' : ''}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </Submenu>

        <div className="HtmlPreviewContextMenu__separator" role="separator" />

        <MenuItem
          label="复制"
          disabled={!hasSelection}
          title={hasSelection ? undefined : '请先选中文字'}
          onClick={() => onSelect({ kind: 'copy' })}
        />
        <MenuItem
          label="翻译"
          disabled={translateDisabled}
          title={translateTitle}
          onClick={() => onSelect({ kind: 'translate' })}
        />
        {showNote ? (
          <>
            <div className="HtmlPreviewContextMenu__separator" role="separator" />
            <MenuItem label="笔记" onClick={() => onSelect({ kind: 'note' })} />
          </>
        ) : null}
      </div>
    </FloatingContextMenuPortal>
  );
}
