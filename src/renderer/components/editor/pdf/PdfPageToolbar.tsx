import { useCallback, useEffect, useState } from 'react';
import { useScroll, useScrollCapability } from '@embedpdf/plugin-scroll/react';

interface PdfPageToolbarProps {
  documentId: string;
}

export default function PdfPageToolbar({ documentId }: PdfPageToolbarProps) {
  const { state, provides } = useScroll(documentId);
  const { provides: scrollCap } = useScrollCapability();
  const { currentPage } = state;
  const [totalPages, setTotalPages] = useState(0);
  const [draft, setDraft] = useState(String(currentPage));
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!scrollCap || !documentId) return;
    const scope = scrollCap.forDocument(documentId);

    const syncTotalPages = () => {
      const total = scope.getTotalPages();
      if (total > 0) setTotalPages(total);
    };

    syncTotalPages();

    const unsubLayout = scrollCap.onLayoutReady((event) => {
      if (event.documentId === documentId && event.totalPages > 0) {
        setTotalPages(event.totalPages);
      }
    });

    const unsubPage = scrollCap.onPageChange((event) => {
      if (event.documentId === documentId && event.totalPages > 0) {
        setTotalPages(event.totalPages);
      }
    });

    return () => {
      unsubLayout();
      unsubPage();
    };
  }, [scrollCap, documentId]);

  useEffect(() => {
    if (!editing) {
      setDraft(String(currentPage));
    }
  }, [currentPage, editing]);

  const jumpToPage = useCallback(
    (raw: string) => {
      if (!provides || totalPages <= 0) return;
      const parsed = Number.parseInt(raw, 10);
      if (!Number.isFinite(parsed)) {
        setDraft(String(currentPage));
        return;
      }
      const page = Math.min(Math.max(1, parsed), totalPages);
      provides.scrollToPage({ pageNumber: page });
      setDraft(String(page));
    },
    [currentPage, provides, totalPages],
  );

  const goPrev = useCallback(() => {
    provides?.scrollToPreviousPage();
  }, [provides]);

  const goNext = useCallback(() => {
    provides?.scrollToNextPage();
  }, [provides]);

  const disabled = !provides || totalPages <= 0;

  return (
    <div className="PdfPreview__pageNav" role="group" aria-label="页面导航">
      <button
        type="button"
        onClick={goPrev}
        disabled={disabled || currentPage <= 1}
        title="上一页"
        aria-label="上一页"
      >
        ‹
      </button>
      <div className="PdfPreview__pageJump">
        <input
          type="text"
          inputMode="numeric"
          className="PdfPreview__pageInput"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onFocus={() => setEditing(true)}
          onBlur={() => {
            setEditing(false);
            jumpToPage(draft);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              event.currentTarget.blur();
            } else if (event.key === 'Escape') {
              setDraft(String(currentPage));
              event.currentTarget.blur();
            }
          }}
          disabled={disabled}
          aria-label={`当前页码，共 ${totalPages} 页`}
        />
        <span className="PdfPreview__pageTotal">
          / {totalPages > 0 ? totalPages : '—'}
        </span>
      </div>
      <button
        type="button"
        onClick={goNext}
        disabled={disabled || currentPage >= totalPages}
        title="下一页"
        aria-label="下一页"
      >
        ›
      </button>
    </div>
  );
}
