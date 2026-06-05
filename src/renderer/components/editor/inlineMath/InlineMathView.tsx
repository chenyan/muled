import { useMemo } from 'react';
import { inlineMathFallbackText } from '../../../lib/inlineMathDelimiters';
import { isMathJaxErrorHtml, renderMathInline } from '../../../lib/renderMath';

export default function InlineMathView({ latex }: { latex: string }) {
  const { html, error } = useMemo(() => renderMathInline(latex), [latex]);
  const fallback = inlineMathFallbackText(latex);
  const renderFailed = !html || Boolean(error) || isMathJaxErrorHtml(html);

  if (!html && !latex.trim()) {
    return (
      <span
        className="MuledInlineMath MuledInlineMath--empty"
        contentEditable={false}
        aria-hidden
      />
    );
  }

  if (!html || renderFailed) {
    return (
      <span
        className="MuledInlineMath MuledInlineMath--fallback"
        contentEditable={false}
        title={error ?? undefined}
      >
        {fallback}
      </span>
    );
  }

  return (
    // eslint-disable-next-line react/no-danger -- MathJax HTML
    <span
      className="MuledInlineMath"
      contentEditable={false}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
