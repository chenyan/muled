import type { PdfRevealTarget } from '../../../types/tab';

interface PdfMnotePageHighlightProps {
  pageIndex: number;
  reveal?: PdfRevealTarget | null;
  quoteHighlight?: PdfRevealTarget | null;
}

function pickPageHighlight(
  pageIndex: number,
  reveal?: PdfRevealTarget | null,
  quoteHighlight?: PdfRevealTarget | null,
): PdfRevealTarget | null {
  const page = pageIndex + 1;
  if (reveal?.page === page && reveal.bbox) return reveal;
  if (quoteHighlight?.page === page && quoteHighlight.bbox) {
    return quoteHighlight;
  }
  return null;
}

export default function PdfMnotePageHighlight({
  pageIndex,
  reveal,
  quoteHighlight,
}: PdfMnotePageHighlightProps) {
  const target = pickPageHighlight(pageIndex, reveal, quoteHighlight);
  if (!target?.bbox) return null;

  const [x1, y1, x2, y2] = target.bbox;
  return (
    <div
      className="PdfMnotePageHighlight"
      style={{
        left: `${x1 * 100}%`,
        top: `${y1 * 100}%`,
        width: `${(x2 - x1) * 100}%`,
        height: `${(y2 - y1) * 100}%`,
      }}
    />
  );
}
