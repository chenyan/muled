import { useCallback, useEffect, useRef, useState } from 'react';
import type { PaletteCompletion } from '../../../shared/paletteAutoCompletion';
import type {
  ShellSearchError,
  ShellSearchMatch,
} from '../../../shared/types/search';
import {
  paletteShellSearchDetail,
  paletteShellSearchLabel,
  parsePaletteShellSearch,
} from '../../lib/paletteShellSearch';
import './CommandPalette.css';

export interface CommandPaletteProps {
  open: boolean;
  initialValue: string;
  onClose: () => void;
  onSubmit: (value: string) => { ok: boolean; error?: string };
  onOpenSearchResult: (match: ShellSearchMatch) => void;
  resolveCompletion?: (
    line: string,
    cycleIndex: number,
  ) => Promise<PaletteCompletion | null>;
}

function shellSearchErrorMessage(error: ShellSearchError): string {
  if (error.code === 'not_installed') {
    return error.hint;
  }
  if (error.code === 'empty_query') {
    return '请输入搜索关键词';
  }
  return error.message;
}

export default function CommandPalette({
  open,
  initialValue,
  onClose,
  onSubmit,
  onOpenSearchResult,
  resolveCompletion,
}: CommandPaletteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [completion, setCompletion] = useState<PaletteCompletion | null>(null);
  const [showGhost, setShowGhost] = useState(false);
  const [cycleIndex, setCycleIndex] = useState(0);
  const [searchMatches, setSearchMatches] = useState<ShellSearchMatch[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchRequestIdRef = useRef(0);
  const activeSearchIdRef = useRef<number | null>(null);

  const isActiveSearchEvent = useCallback((searchId: number) => {
    return (
      searchId === activeSearchIdRef.current ||
      searchId === searchRequestIdRef.current
    );
  }, []);

  const shellSearch = parsePaletteShellSearch(value);
  const inShellSearchMode = shellSearch !== null;
  const shellSearchQuery = shellSearch?.query ?? '';
  const shellSearchCommand = shellSearch?.command ?? null;

  const clearCompletion = useCallback(() => {
    setCompletion(null);
    setShowGhost(false);
    setCycleIndex(0);
  }, []);

  const resetSearch = useCallback(() => {
    setSearchMatches([]);
    setSearchLoading(false);
    setSelectedIndex(0);
  }, []);

  const cancelActiveSearch = useCallback(() => {
    const searchId = activeSearchIdRef.current;
    if (searchId !== null) {
      void window.muled.search.cancel(searchId);
      activeSearchIdRef.current = null;
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = window.muled.search.onStream((event) => {
      if (!isActiveSearchEvent(event.searchId)) {
        return;
      }

      if (event.type === 'match') {
        setSearchMatches((prev) => [...prev, event.match]);
        return;
      }

      if (event.type === 'error') {
        if (event.error.code !== 'empty_query') {
          setError(shellSearchErrorMessage(event.error));
        }
        setSearchLoading(false);
        if (activeSearchIdRef.current === event.searchId) {
          activeSearchIdRef.current = null;
        }
        return;
      }

      setSearchLoading(false);
      if (activeSearchIdRef.current === event.searchId) {
        activeSearchIdRef.current = null;
      }
    });

    return unsubscribe;
  }, [isActiveSearchEvent]);

  useEffect(() => {
    if (!open) return undefined;
    setValue(initialValue);
    setError(null);
    clearCompletion();
    resetSearch();
    const id = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(id);
  }, [open, initialValue, clearCompletion, resetSearch]);

  useEffect(() => {
    if (!open || !shellSearchCommand) {
      cancelActiveSearch();
      resetSearch();
      return undefined;
    }

    const query = shellSearchQuery.trim();
    if (!query) {
      cancelActiveSearch();
      resetSearch();
      setError(null);
      return undefined;
    }

    const requestId = searchRequestIdRef.current + 1;
    searchRequestIdRef.current = requestId;
    cancelActiveSearch();
    setSearchMatches([]);
    setSelectedIndex(0);
    setSearchLoading(true);
    setError(null);

    const timer = window.setTimeout(() => {
      void (async () => {
        if (searchRequestIdRef.current !== requestId) {
          return;
        }

        activeSearchIdRef.current = requestId;
        const result = await window.muled.search.start({
          searchId: requestId,
          command: shellSearchCommand,
          query,
        });

        if (searchRequestIdRef.current !== requestId) {
          return;
        }

        if (!result.ok) {
          activeSearchIdRef.current = null;
          setSearchLoading(false);
          setSearchMatches([]);
          if (result.error.code !== 'empty_query') {
            setError(shellSearchErrorMessage(result.error));
          }
        }
      })();
    }, 250);

    return () => {
      window.clearTimeout(timer);
      searchRequestIdRef.current += 1;
      cancelActiveSearch();
    };
  }, [
    cancelActiveSearch,
    open,
    resetSearch,
    shellSearchCommand,
    shellSearchQuery,
  ]);

  const openSearchResult = useCallback(
    (match: ShellSearchMatch) => {
      onOpenSearchResult(match);
      onClose();
    },
    [onClose, onOpenSearchResult],
  );

  const submit = useCallback(() => {
    if (inShellSearchMode) {
      const match = searchMatches[selectedIndex];
      if (match) {
        openSearchResult(match);
      }
      return;
    }

    const result = onSubmit(value);
    if (result.ok) {
      onClose();
      return;
    }
    setError(result.error ?? '命令执行失败');
  }, [
    inShellSearchMode,
    onClose,
    onSubmit,
    openSearchResult,
    searchMatches,
    selectedIndex,
    value,
  ]);

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

  const showResultsPanel =
    inShellSearchMode && shellSearchQuery.trim().length > 0;

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
            placeholder="cd · rg · fd · s/…/…/g · mode normal|vim"
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
              } else if (
                inShellSearchMode &&
                searchMatches.length > 0 &&
                e.key === 'ArrowDown'
              ) {
                e.preventDefault();
                setSelectedIndex((index) =>
                  Math.min(index + 1, searchMatches.length - 1),
                );
              } else if (
                inShellSearchMode &&
                searchMatches.length > 0 &&
                e.key === 'ArrowUp'
              ) {
                e.preventDefault();
                setSelectedIndex((index) => Math.max(index - 1, 0));
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

        {showResultsPanel ? (
          <div className="CommandPalette__results" role="listbox">
            {searchLoading && searchMatches.length === 0 ? (
              <div className="CommandPalette__resultsStatus">搜索中…</div>
            ) : null}
            {!searchLoading && searchMatches.length === 0 && !error ? (
              <div className="CommandPalette__resultsStatus">无匹配结果</div>
            ) : null}
            {searchMatches.map((match, index) => {
              const detail = paletteShellSearchDetail(match);
              return (
                <button
                  key={`${match.kind}:${paletteShellSearchLabel(match)}:${index}`}
                  type="button"
                  role="option"
                  aria-selected={index === selectedIndex}
                  className={[
                    'CommandPalette__result',
                    index === selectedIndex
                      ? 'CommandPalette__result--selected'
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onClick={() => openSearchResult(match)}
                >
                  <span className="CommandPalette__resultLabel">
                    {paletteShellSearchLabel(match)}
                  </span>
                  {detail ? (
                    <span className="CommandPalette__resultDetail">{detail}</span>
                  ) : null}
                </button>
              );
            })}
            {searchLoading && searchMatches.length > 0 ? (
              <div className="CommandPalette__resultsStatus">搜索中…</div>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <div className="CommandPalette__error" role="alert">
            {error}
          </div>
        ) : (
          <div id="command-palette-hint" className="CommandPalette__hint">
            <strong>cd</strong> 工作区 · <strong>rg</strong> 内容 ·{' '}
            <strong>fd</strong> 文件名 · <strong>s/…/…/g</strong> 替换 ·{' '}
            <strong>mode normal|vim</strong> 键位 · Tab 补全 · Esc 关闭
          </div>
        )}
      </div>
    </div>
  );
}
