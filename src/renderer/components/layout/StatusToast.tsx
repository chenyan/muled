import { useEffect, useState } from 'react';
import {
  subscribeStatusToast,
  type StatusToastMessage,
} from '../../lib/statusToast';
import './StatusToast.css';

const DISMISS_MS = 4000;

export default function StatusToast() {
  const [toasts, setToasts] = useState<StatusToastMessage[]>([]);

  useEffect(() => {
    subscribeStatusToast((toast) => {
      setToasts((prev) => [...prev, toast]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, DISMISS_MS);
    });
    return () => subscribeStatusToast(null);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="StatusToast__stack" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`StatusToast StatusToast--${t.kind}`}
          role="status"
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
