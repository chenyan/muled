import { useMemo } from 'react';
import { renderMathInline } from '../../../lib/renderMath';

export default function InlineMathView({ latex }: { latex: string }) {
  const { html, error } = useMemo(() => renderMathInline(latex), [latex]);

  if (error) {
    return (
      <span className="MuledInlineMath MuledInlineMath--error" title={error}>
        ${latex}$
      </span>
    );
  }

  if (!html) {
    return <span className="MuledInlineMath MuledInlineMath--empty">$…$</span>;
  }

  return (
    // eslint-disable-next-line react/no-danger -- KaTeX HTML
    <span
      className="MuledInlineMath"
      contentEditable={false}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
