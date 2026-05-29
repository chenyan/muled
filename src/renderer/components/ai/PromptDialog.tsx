import { useCallback, useEffect, useRef, useState } from 'react';
import type { AiApplyMode } from '../../../shared/buildAiPrompt';
import './PromptDialog.css';

export interface PromptDialogProps {
  open: boolean;
  mode: AiApplyMode;
  selectionPreview: string;
  hasApiKey: boolean;
  onClose: () => void;
  onSubmit: (
    prompt: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
}

const MODE_LABEL: Record<AiApplyMode, string> = {
  append: 'Chat Append',
  replace: 'Chat Replace',
};

export default function PromptDialog({
  open,
  mode,
  selectionPreview,
  hasApiKey,
  onClose,
  onSubmit,
}: PromptDialogProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    setPrompt('');
    setError(null);
    setLoading(false);
    const id = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [open, mode]);

  const submit = useCallback(async () => {
    if (!hasApiKey) {
      setError('未配置 OpenAI API Key');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await onSubmit(prompt);
      if (result.ok) {
        onClose();
        return;
      }
      setError(result.error);
    } finally {
      setLoading(false);
    }
  }, [hasApiKey, onClose, onSubmit, prompt]);

  if (!open) return null;

  const preview =
    selectionPreview.length > 120
      ? `${selectionPreview.slice(0, 120)}…`
      : selectionPreview;

  return (
    <div
      className="PromptDialog__backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div className="PromptDialog" role="dialog" aria-label={MODE_LABEL[mode]}>
        <header className="PromptDialog__header">
          <h2 className="PromptDialog__title">{MODE_LABEL[mode]}</h2>
          <button
            type="button"
            className="PromptDialog__close"
            disabled={loading}
            aria-label="关闭"
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <div className="PromptDialog__selection" title={selectionPreview}>
          <span className="PromptDialog__selectionLabel">选区</span>
          <code>{preview || '（空）'}</code>
        </div>
        <textarea
          ref={inputRef}
          className="PromptDialog__input"
          rows={4}
          value={prompt}
          disabled={loading || !hasApiKey}
          placeholder="描述你希望 AI 如何处理选中文本…"
          onChange={(e) => {
            setPrompt(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && !loading) {
              e.preventDefault();
              onClose();
            } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit().catch(() => undefined);
            }
          }}
        />
        {!hasApiKey && (
          <p className="PromptDialog__warn">
            请在 <code>~/.config/muled/muled.yaml</code> 配置{' '}
            <code>openai.api_key</code>
          </p>
        )}
        {error && (
          <div className="PromptDialog__error" role="alert">
            {error}
          </div>
        )}
        <footer className="PromptDialog__footer">
          <span className="PromptDialog__hint">⌘↵ 提交 · Esc 关闭</span>
          <div className="PromptDialog__actions">
            <button
              type="button"
              className="PromptDialog__btn PromptDialog__btn--ghost"
              disabled={loading}
              onClick={onClose}
            >
              取消
            </button>
            <button
              type="button"
              className="PromptDialog__btn PromptDialog__btn--primary"
              disabled={loading || !hasApiKey || !prompt.trim()}
              onClick={() => {
                submit().catch(() => undefined);
              }}
            >
              {loading ? '请求中…' : '发送'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
