import { useCallback, useEffect, useRef, useState } from 'react';
import type { PaletteCompletion } from '../../../shared/paletteAutoCompletion';
import './CommandPalette.css';

export interface CommandPaletteProps {
  open: boolean;
  initialValue: string;
  onClose: () => void;
  onSubmit: (value: string) => { ok: boolean; error?: string };
  resolveCompletion?: (
    line: string,
    cycleIndex: number,
  ) => Promise<PaletteCompletion | null>;
}

export default function CommandPalette({
  open,
  initialValue,
  onClose,
  onSubmit,
  resolveCompletion,
}: CommandPaletteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [completion, setCompletion] = useState<PaletteCompletion | null>(null);
  const [showGhost, setShowGhost] = useState(false);
  const [cycleIndex, setCycleIndex] = useState(0);

  const clearCompletion = useCallback(() => {
    setCompletion(null);
    setShowGhost(false);
    setCycleIndex(0);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    setValue(initialValue);
    setError(null);
    clearCompletion();
    const id = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(id);
  }, [open, initialValue, clearCompletion]);

  const submit = useCallback(() => {
    const result = onSubmit(value);
    if (result.ok) {
      onClose();
      return;
    }
    setError(result.error ?? '命令执行失败');
  }, [onClose, onSubmit, value]);

  const requestCompletion = useCallback(
    async (nextCycleIndex: number) => {
      if (!resolveCompletion) {
        return;
      }
      const next = await resolveCompletion(value, nextCycleIndex);
      if (!next) {
        clearCompletion();
        return;
      }
      setCompletion(next);
      setShowGhost(true);
      setCycleIndex(nextCycleIndex);
    },
    [clearCompletion, resolveCompletion, value],
  );

  const applyCompletion = useCallback(() => {
    if (!completion) {
      return;
    }
    const { completedLine } = completion;
    setValue(completedLine);
    clearCompletion();
    setError(null);
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(
        completedLine.length,
        completedLine.length,
      );
    });
  }, [clearCompletion, completion]);

  if (!open) return null;

  const ghostSuffix =
    showGhost && completion && completion.ghostSuffix.length > 0
      ? completion.ghostSuffix
      : '';

  return (
    <div
      className="CommandPalette__backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="CommandPalette" role="dialog" aria-label="命令面板">
        <div className="CommandPalette__inputWrap">
          <div className="CommandPalette__inputMirror" aria-hidden="true">
            <span className="CommandPalette__inputMirrorText">{value}</span>
            {ghostSuffix ? (
              <span className="CommandPalette__ghost">{ghostSuffix}</span>
            ) : null}
          </div>
          <input
            ref={inputRef}
            className="CommandPalette__input"
            type="text"
            spellCheck={false}
            value={value}
            placeholder="cd · s/…/…/g · mode normal|vim"
            aria-describedby="command-palette-hint"
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
              clearCompletion();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
              } else if (e.key === 'Enter') {
                e.preventDefault();
                submit();
              } else if (e.key === 'Tab') {
                e.preventDefault();
                if (showGhost && completion && completion.matchCount > 1) {
                  void requestCompletion(cycleIndex + 1);
                } else {
                  void requestCompletion(0);
                }
              } else if (e.key === 'ArrowRight' && completion && showGhost) {
                e.preventDefault();
                applyCompletion();
              }
            }}
          />
        </div>
        {error ? (
          <div className="CommandPalette__error" role="alert">
            {error}
          </div>
        ) : (
          <div id="command-palette-hint" className="CommandPalette__hint">
            <strong>cd</strong> 工作区 · <strong>s/…/…/g</strong> 替换 ·{' '}
            <strong>mode normal|vim</strong> 键位 · Tab 补全 · → 填入 · Esc
            关闭
          </div>
        )}
      </div>
    </div>
  );
}
