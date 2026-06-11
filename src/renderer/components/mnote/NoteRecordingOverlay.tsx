import { useCallback, useEffect, useRef, useState } from 'react';
import './NoteRecordingOverlay.css';

export interface NoteRecordingOverlayProps {
  open: boolean;
  quote: string;
  anchorRect: DOMRect | null;
  anchorX: number;
  anchorY: number;
  saving?: boolean;
  onClose: () => void;
  onSave: (input: { quote: string; body: string; label: string }) => void;
}

function clampPosition(
  anchorRect: DOMRect | null,
  anchorX: number,
  anchorY: number,
  popupWidth: number,
  popupHeight: number,
): { top: number; left: number } {
  const margin = 8;
  const baseTop = anchorRect ? anchorRect.bottom + margin : anchorY;
  const baseLeft = anchorRect ? anchorRect.left : anchorX;
  const top = Math.min(
    baseTop,
    window.innerHeight - popupHeight - margin,
  );
  const left = Math.min(
    baseLeft,
    window.innerWidth - popupWidth - margin,
  );
  return {
    top: Math.max(margin, top),
    left: Math.max(margin, left),
  };
}

export default function NoteRecordingOverlay({
  open,
  quote: initialQuote,
  anchorRect,
  anchorX,
  anchorY,
  saving = false,
  onClose,
  onSave,
}: NoteRecordingOverlayProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const quoteRef = useRef<HTMLTextAreaElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [quote, setQuote] = useState(initialQuote);
  const [body, setBody] = useState('');
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    setQuote(initialQuote);
    setBody('');
    setLabel('');
    const id = window.requestAnimationFrame(() => {
      if (initialQuote.trim()) {
        bodyRef.current?.focus();
      } else {
        quoteRef.current?.focus();
      }
    });
    return () => window.cancelAnimationFrame(id);
  }, [initialQuote, open]);

  useEffect(() => {
    if (!open) return undefined;

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
  }, [onClose, open]);

  const submit = useCallback(() => {
    onSave({ quote, body, label });
  }, [body, label, onSave, quote]);

  if (!open) return null;

  const panel = panelRef.current;
  const width = panel?.offsetWidth ?? 400;
  const height = panel?.offsetHeight ?? 320;
  const position = clampPosition(anchorRect, anchorX, anchorY, width, height);

  return (
    <div
      ref={panelRef}
      className="NoteRecordingOverlay"
      style={{ top: position.top, left: position.left }}
      role="dialog"
      aria-label="记录笔记"
    >
      <div className="NoteRecordingOverlay__header">记录笔记</div>
      <label className="NoteRecordingOverlay__field">
        <span className="NoteRecordingOverlay__label">摘录（可选）</span>
        <textarea
          ref={quoteRef}
          className="NoteRecordingOverlay__textarea NoteRecordingOverlay__textarea--quote"
          rows={3}
          value={quote}
          placeholder="留空表示仅记录位置"
          onChange={(e) => setQuote(e.target.value)}
        />
      </label>
      <label className="NoteRecordingOverlay__field">
        <span className="NoteRecordingOverlay__label">批注</span>
        <textarea
          ref={bodyRef}
          className="NoteRecordingOverlay__textarea"
          rows={4}
          value={body}
          placeholder="Markdown 批注"
          onChange={(e) => setBody(e.target.value)}
        />
      </label>
      <label className="NoteRecordingOverlay__field">
        <span className="NoteRecordingOverlay__label">标签（可选）</span>
        <input
          className="NoteRecordingOverlay__input"
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
      </label>
      <div className="NoteRecordingOverlay__actions">
        <button
          type="button"
          className="NoteRecordingOverlay__button"
          disabled={saving}
          onClick={onClose}
        >
          取消
        </button>
        <button
          type="button"
          className="NoteRecordingOverlay__button NoteRecordingOverlay__button--primary"
          disabled={saving}
          onClick={submit}
        >
          {saving ? '保存中…' : '保存'}
        </button>
      </div>
    </div>
  );
}
