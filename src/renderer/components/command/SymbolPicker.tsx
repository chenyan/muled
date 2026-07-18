import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { openTabSymbolIndex } from '../../lib/symbols/openTabSymbolIndex';
import type {
  SymbolDef,
  SymbolPickerMode,
  SymbolRef,
} from '../../lib/symbols/types';
import './SymbolPicker.css';

export interface SymbolPickerProps {
  open: boolean;
  mode: SymbolPickerMode;
  initialQuery: string;
  preferPath?: string | null;
  onClose: () => void;
  onSelect: (target: {
    relativePath: string;
    line: number;
    column: number;
    length: number;
  }) => void;
}

type PickerItem =
  | { kind: 'def'; def: SymbolDef }
  | { kind: 'ref'; ref: SymbolRef };

function modeTitle(mode: SymbolPickerMode): string {
  switch (mode) {
    case 'goto-symbol':
      return '转到符号';
    case 'goto-definition':
      return '转到定义';
    case 'references':
      return '查找引用';
    default:
      return '符号';
  }
}

function modePlaceholder(mode: SymbolPickerMode): string {
  switch (mode) {
    case 'goto-symbol':
      return '按名称过滤打开标签页中的符号…';
    case 'goto-definition':
      return '选择定义…';
    case 'references':
      return '按名称查找引用…';
    default:
      return '搜索…';
  }
}

function itemKey(item: PickerItem, index: number): string {
  if (item.kind === 'def') {
    const d = item.def;
    return `d:${d.relativePath}:${d.from}:${d.to}:${index}`;
  }
  const r = item.ref;
  return `r:${r.relativePath}:${r.from}:${r.to}:${index}`;
}

export default function SymbolPicker({
  open,
  mode,
  initialQuery,
  preferPath,
  onClose,
  onSelect,
}: SymbolPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(initialQuery);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!open) return undefined;
    setQuery(initialQuery);
    setSelectedIndex(0);
    const id = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(id);
  }, [open, initialQuery, mode]);

  const items = useMemo((): PickerItem[] => {
    if (!open) return [];
    if (mode === 'references') {
      const name = query.trim() || initialQuery.trim();
      return openTabSymbolIndex
        .findReferences(name)
        .map((ref) => ({ kind: 'ref' as const, ref }));
    }
    if (mode === 'goto-definition') {
      const name = query.trim() || initialQuery.trim();
      return openTabSymbolIndex
        .findDefinitions(name, preferPath)
        .map((def) => ({ kind: 'def' as const, def }));
    }
    return openTabSymbolIndex
      .filterDefinitions(query)
      .map((def) => ({ kind: 'def' as const, def }));
  }, [open, mode, query, initialQuery, preferPath]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, mode]);

  const selectAt = useCallback(
    (index: number) => {
      const item = items[index];
      if (!item) return;
      if (item.kind === 'def') {
        const d = item.def;
        onSelect({
          relativePath: d.relativePath,
          line: d.line,
          column: d.column,
          length: Math.max(1, d.to - d.from),
        });
      } else {
        const r = item.ref;
        onSelect({
          relativePath: r.relativePath,
          line: r.line,
          column: r.column,
          length: Math.max(1, r.to - r.from),
        });
      }
      onClose();
    },
    [items, onClose, onSelect],
  );

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, Math.max(0, items.length - 1)));
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        selectAt(selectedIndex);
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [open, items.length, selectedIndex, onClose, selectAt]);

  if (!open) return null;

  return (
    <div
      className="SymbolPicker__backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="SymbolPicker" role="dialog" aria-label={modeTitle(mode)}>
        <div className="SymbolPicker__header">{modeTitle(mode)}</div>
        <input
          ref={inputRef}
          className="SymbolPicker__input"
          value={query}
          placeholder={modePlaceholder(mode)}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="SymbolPicker__results" role="listbox">
          {items.length === 0 ? (
            <div className="SymbolPicker__empty">无匹配结果</div>
          ) : (
            items.slice(0, 200).map((item, index) => {
              const selected = index === selectedIndex;
              if (item.kind === 'def') {
                const d = item.def;
                return (
                  <button
                    key={itemKey(item, index)}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={
                      selected
                        ? 'SymbolPicker__result SymbolPicker__result--selected'
                        : 'SymbolPicker__result'
                    }
                    onMouseEnter={() => setSelectedIndex(index)}
                    onClick={() => selectAt(index)}
                  >
                    <span className="SymbolPicker__resultMain">
                      <span className="SymbolPicker__kind">{d.kind}</span>
                      <span className="SymbolPicker__name">{d.name}</span>
                    </span>
                    <span className="SymbolPicker__detail">
                      {d.relativePath}:{d.line}
                    </span>
                    <span className="SymbolPicker__preview">{d.preview}</span>
                  </button>
                );
              }
              const r = item.ref;
              return (
                <button
                  key={itemKey(item, index)}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={
                    selected
                      ? 'SymbolPicker__result SymbolPicker__result--selected'
                      : 'SymbolPicker__result'
                  }
                  onMouseEnter={() => setSelectedIndex(index)}
                  onClick={() => selectAt(index)}
                >
                  <span className="SymbolPicker__resultMain">
                    <span className="SymbolPicker__name">{r.name}</span>
                  </span>
                  <span className="SymbolPicker__detail">
                    {r.relativePath}:{r.line}
                  </span>
                </button>
              );
            })
          )}
        </div>
        <div className="SymbolPicker__hint">
          ↑↓ 选择 · Enter 跳转 · Esc 关闭 · 仅搜索已打开标签页
        </div>
      </div>
    </div>
  );
}
