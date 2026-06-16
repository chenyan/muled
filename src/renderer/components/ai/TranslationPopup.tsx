import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import TranslationMarkdown from './TranslationMarkdown';
import './TranslationPopup.css';

export interface TranslationPopupState {
  rect: DOMRect;
  sentence: string;
  status: 'loading' | 'done' | 'error';
  content?: string;
  error?: string;
}

export interface TranslationPopupProps {
  popup: TranslationPopupState | null;
  onClose: () => void;
}

function clampPosition(
  rect: DOMRect,
  popupWidth: number,
  popupHeight: number,
): { top: number; left: number } {
  const margin = 12;
  const maxHeight = window.innerHeight - margin * 2;
  const height = Math.min(popupHeight, maxHeight);
  const spaceBelow = window.innerHeight - rect.bottom - margin;
  const spaceAbove = rect.top - margin;

  let top: number;
  if (height <= spaceBelow) {
    top = rect.bottom + margin;
  } else if (height <= spaceAbove) {
    top = rect.top - height - margin;
  } else {
    top = Math.max(margin, window.innerHeight - height - margin);
  }

  const left = Math.min(
    Math.max(rect.left, margin),
    window.innerWidth - popupWidth - margin,
  );

  return { top, left };
}

export default function TranslationPopup({
  popup,
  onClose,
}: TranslationPopupProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!popup || !panelRef.current) return;
    const panel = panelRef.current;
    const rect = panel.getBoundingClientRect();
    setPosition(clampPosition(popup.rect, rect.width, rect.height));
  }, [popup?.content, popup?.error, popup?.rect, popup?.sentence, popup?.status]);

  useEffect(() => {
    if (!popup) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const onPointerDown = (event: MouseEvent) => {
      const panel = panelRef.current;
      if (panel && !panel.contains(event.target as Node)) {
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('mousedown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('mousedown', onPointerDown);
    };
  }, [onClose, popup]);

  if (!popup) return null;

  return (
    <div
      ref={panelRef}
      className="TranslationPopup"
      style={{ top: position.top, left: position.left }}
      role="dialog"
      aria-label="翻译结果"
      aria-busy={popup.status === 'loading'}
    >
      <header className="TranslationPopup__header">
        <span className="TranslationPopup__title">翻译</span>
        <button
          type="button"
          className="TranslationPopup__close"
          aria-label="关闭"
          onClick={onClose}
        >
          ×
        </button>
      </header>
      <p className="TranslationPopup__sentence">{popup.sentence}</p>
      <div className="TranslationPopup__body">
        {popup.status === 'loading' && (
          <p className="TranslationPopup__loading">翻译中…</p>
        )}
        {popup.status === 'error' && (
          <p className="TranslationPopup__error">{popup.error ?? '翻译失败'}</p>
        )}
        {popup.status === 'done' && popup.content && (
          <TranslationMarkdown source={popup.content} />
        )}
      </div>
    </div>
  );
}
