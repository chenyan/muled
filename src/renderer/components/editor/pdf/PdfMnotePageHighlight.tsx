import type { PdfRevealTarget } from '../../../types/tab';

interface PdfMnotePageHighlightProps {
  pageIndex: number;
  reveal: PdfRevealTarget | null | undefined;
}

export default function PdfMnotePageHighlight({
  pageIndex,
  reveal,
}: PdfMnotePageHighlightProps) {
  if (!reveal || reveal.page !== pageIndex + 1 || !reveal.bbox) {
    return null;
  }

  const [x1, y1, x2, y2] = reveal.bbox;
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
