import { type CodeBlockEditorProps } from '@mdxeditor/editor';
import { useMemo, useRef } from 'react';
import renderMathBlock from '../../../lib/renderMath';
import useCodeBlockFocus from './useCodeBlockFocus';

export default function MathCodeBlockEditor({
  code,
  focusEmitter,
}: CodeBlockEditorProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const { html, error } = useMemo(() => renderMathBlock(code), [code]);

  useCodeBlockFocus(focusEmitter, previewRef);

  return (
    <div className="MuledCodeBlockWithPreview MuledCodeBlockWithPreview--mathOnly">
      <div
        ref={previewRef}
        className="MuledCodeBlockWithPreview__preview MuledCodeBlockWithPreview__preview--mathOnly"
        tabIndex={0}
        role="img"
        aria-label="LaTeX 公式"
        title={error ?? undefined}
      >
        {error && !html && (
          <p className="MuledCodeBlockWithPreview__error">{error}</p>
        )}
        {!error && !html && !code.trim() && (
          <p className="MuledCodeBlockWithPreview__empty">空公式</p>
        )}
        {html && (
          // eslint-disable-next-line react/no-danger -- KaTeX HTML
          <div dangerouslySetInnerHTML={{ __html: html }} />
        )}
      </div>
    </div>
  );
}
