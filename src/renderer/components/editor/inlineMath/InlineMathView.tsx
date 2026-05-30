import { useMemo } from 'react';
import { renderMathInline } from '../../../lib/renderMath';

export default function InlineMathView({ latex }: { latex: string }) {
  const { html, error } = useMemo(() => renderMathInline(latex), [latex]);

  if (!html && !latex.trim()) {
    return (
      <span
        className="MuledInlineMath MuledInlineMath--empty"
        contentEditable={false}
        aria-hidden
      />
    );
  }

  if (!html) {
    return (
      <span
        className="MuledInlineMath MuledInlineMath--error"
        contentEditable={false}
        title={error ?? '公式语法有误'}
      >
        …
      </span>
    );
  }

  return (
    // eslint-disable-next-line react/no-danger -- KaTeX HTML
    <span
      className={`MuledInlineMath${error ? ' MuledInlineMath--error' : ''}`}
      contentEditable={false}
      title={error ?? undefined}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
