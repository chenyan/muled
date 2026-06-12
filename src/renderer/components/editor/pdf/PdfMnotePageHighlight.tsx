import type { PdfRevealTarget } from '../../../types/tab';

interface PdfMnotePageHighlightProps {
  pageIndex: number;
  reveal?: PdfRevealTarget | null;
  pageHighlights?: PdfRevealTarget[];
  activeEntryId?: string | null;
}

function collectPageHighlights(
  pageIndex: number,
  pageHighlights: PdfRevealTarget[],
  reveal?: PdfRevealTarget | null,
): PdfRevealTarget[] {
  const page = pageIndex + 1;
  const onPage = pageHighlights.filter(
    (target) => target.page === page && target.bbox,
  );
  if (
    reveal?.page === page &&
    reveal.bbox &&
    !onPage.some((target) => target.id === reveal.id)
  ) {
    onPage.push(reveal);
  }
  return onPage;
}

export default function PdfMnotePageHighlight({
  pageIndex,
  reveal,
  pageHighlights = [],
  activeEntryId = null,
}: PdfMnotePageHighlightProps) {
  const targets = collectPageHighlights(pageIndex, pageHighlights, reveal);
  if (targets.length === 0) return null;

  return (
    <>
      {targets.map((target) => {
        const [x1, y1, x2, y2] = target.bbox!;
        const isActive = activeEntryId !== null && target.id === activeEntryId;
        return (
          <div
            key={target.id}
            className={
              isActive
                ? 'PdfMnotePageHighlight PdfMnotePageHighlight--active'
                : 'PdfMnotePageHighlight'
            }
            style={{
              left: `${x1 * 100}%`,
              top: `${y1 * 100}%`,
              width: `${(x2 - x1) * 100}%`,
              height: `${(y2 - y1) * 100}%`,
            }}
          />
        );
      })}
    </>
  );
}
