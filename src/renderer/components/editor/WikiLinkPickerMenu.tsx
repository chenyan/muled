import { useEffect, useRef } from 'react';
import type { FdSearchMatch } from '../../../shared/types/search';
import './WikiLinkPickerMenu.css';

export interface WikiLinkPickerMenuProps {
  x: number;
  y: number;
  title: string;
  matches: FdSearchMatch[];
  onSelect: (match: FdSearchMatch) => void;
  onClose: () => void;
}

export default function WikiLinkPickerMenu({
  x,
  y,
  title,
  matches,
  onSelect,
  onClose,
}: WikiLinkPickerMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    const onPointerDown = (event: MouseEvent) => {
      const element = menuRef.current;
      if (element && !element.contains(event.target as Node)) {
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
      className="WikiLinkPickerMenu"
      style={{ left: x, top: y }}
      role="menu"
      aria-label={`选择页面: ${title}`}
    >
      <div className="WikiLinkPickerMenu__header">「{title}」匹配到 {matches.length} 个页面</div>
      {matches.map((match) => (
        <button
          key={match.path}
          type="button"
          role="menuitem"
          className="WikiLinkPickerMenu__item"
          onClick={() => onSelect(match)}
        >
          {match.path}
        </button>
      ))}
    </div>
  );
}
