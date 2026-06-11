import { useEffect, useMemo, useRef } from 'react';
import { parseMnoteDocument, type MnoteEntry } from '../../lib/mnoteFormat';
import { isMnoteEntryLocStale } from '../../lib/mnoteRelocate';
import './mnoteEntryShared.css';
import './MnotePanelView.css';

export interface MnotePanelViewProps {
  content: string;
  sourceContent?: string;
  sourceMissing?: boolean;
  activeEntryId?: string | null;
  scrollToEntryId?: string | null;
  onEntryClick: (entry: MnoteEntry) => void;
}

export default function MnotePanelView({
  content,
  sourceContent = '',
  sourceMissing = false,
  activeEntryId,
  scrollToEntryId,
  onEntryClick,
}: MnotePanelViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const doc = useMemo(() => parseMnoteDocument(content), [content]);
  const entries = doc?.entries ?? [];

  useEffect(() => {
    if (!scrollToEntryId) return;
    const root = scrollRef.current;
    if (!root) return;
    const card = root.querySelector<HTMLElement>(
      `[data-mnote-entry-id="${scrollToEntryId}"]`,
    );
    card?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [scrollToEntryId]);

  const staleById = useMemo(() => {
    if (!sourceContent || sourceMissing) return new Map<string, boolean>();
    const map = new Map<string, boolean>();
    for (const entry of entries) {
      map.set(entry.id, isMnoteEntryLocStale(entry, sourceContent));
    }
    return map;
  }, [entries, sourceContent, sourceMissing]);

  if (entries.length === 0) {
    return (
      <div className="MnotePanelView MnotePanelView--empty">
        <p>暂无笔记条目</p>
        <p className="MnotePanelView__hint">在源文件中右键「记录笔记」添加</p>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="MnotePanelView">
      {sourceMissing ? (
        <div className="MnotePanelView__orphanBanner" role="alert">
          绑定的源文件不存在，位置可能已失效
        </div>
      ) : null}
      {entries.map((entry) => {
        const isActive = activeEntryId === entry.id;
        const isStale = staleById.get(entry.id) ?? false;
        return (
          <button
            key={entry.id}
            type="button"
            data-mnote-entry-id={entry.id}
            className={`MnotePanelView__card${isActive ? ' MnotePanelView__card--active' : ''}${isStale ? ' MnotePanelView__card--stale' : ''}`}
            onClick={() => onEntryClick(entry)}
          >
            <div className="MnoteEntryMeta__header">
              <span className="MnoteEntryMeta__entryId">{entry.id}</span>
              {isStale ? (
                <span className="MnotePanelView__staleBadge">位置可能失效</span>
              ) : null}
              {entry.label ? (
                <span className="MnoteEntryMeta__label">{entry.label}</span>
              ) : null}
            </div>
            <div className="MnoteEntryMeta__loc">{entry.loc}</div>
            {entry.quote ? (
              <blockquote className="MnoteEntryMeta__quote">{entry.quote}</blockquote>
            ) : null}
            {entry.body ? (
              <div className="MnoteEntryMeta__body">{entry.body}</div>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
