import { useEffect, useRef } from 'react';
import type { SchemeTerminalCompletionMatch } from '../../lib/scheme/schemeTerminalCompletion';
import './SchemeTerminalCompletionPopup.css';

interface SchemeTerminalCompletionPopupProps {
  open: boolean;
  matches: SchemeTerminalCompletionMatch[];
  selectedIndex: number;
  anchor: { left: number; top: number } | null;
  prefix: string;
  onSelect: (index: number) => void;
  onDismiss: () => void;
}

export default function SchemeTerminalCompletionPopup({
  open,
  matches,
  selectedIndex,
  anchor,
  prefix,
  onSelect,
  onDismiss,
}: SchemeTerminalCompletionPopupProps) {
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onDismiss();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [open, onDismiss]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const item = listRef.current.children[selectedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [open, selectedIndex]);

  if (!open || !anchor || matches.length === 0) {
    return null;
  }

  return (
    <ul
      ref={listRef}
      className="SchemeTerminalCompletionPopup"
      style={{ left: anchor.left, top: anchor.top }}
      role="listbox"
      aria-label="Scheme 补全"
    >
      {matches.map((match, index) => (
        <li
          key={`${match.kind}:${match.label}`}
          className={`SchemeTerminalCompletionPopup__item${
            index === selectedIndex
              ? ' SchemeTerminalCompletionPopup__item--selected'
              : ''
          }`}
          role="option"
          aria-selected={index === selectedIndex}
          onMouseDown={(event) => {
            event.preventDefault();
            onSelect(index);
          }}
        >
          <span
            className={`SchemeTerminalCompletionPopup__kind SchemeTerminalCompletionPopup__kind--${match.kind}`}
          >
            {match.kind === 'keyword' ? 'kw' : 'sym'}
          </span>
          <span className="SchemeTerminalCompletionPopup__label">
            {prefix ? (
              <>
                <span className="SchemeTerminalCompletionPopup__matched">
                  {match.label.slice(0, prefix.length)}
                </span>
                {match.label.slice(prefix.length)}
              </>
            ) : (
              match.label
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
