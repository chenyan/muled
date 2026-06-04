import { type CodeBlockEditorProps } from '@mdxeditor/editor';
import { useMemo, useRef } from 'react';
import useCodeBlockInView from '../../../hooks/useCodeBlockInView';
import renderMathBlock from '../../../lib/renderMath';
import useCodeBlockFocus from './useCodeBlockFocus';

export default function MathCodeBlockEditor({
  code,
  focusEmitter,
}: CodeBlockEditorProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const inView = useCodeBlockInView(rootRef);
  const { html, error } = useMemo(
    () => (inView ? renderMathBlock(code) : { html: '', error: null }),
    [code, inView],
  );

  useCodeBlockFocus(focusEmitter, previewRef);

  return (
    <div
      ref={rootRef}
      className="MuledCodeBlockWithPreview MuledCodeBlockWithPreview--mathOnly"
    >
      <div
        ref={previewRef}
        className="MuledCodeBlockWithPreview__preview MuledCodeBlockWithPreview__preview--mathOnly"
        tabIndex={0}
        role="img"
        aria-label="LaTeX 公式"
        title={error ?? undefined}
      >
        {!inView && code.trim() && (
          <p className="MuledCodeBlockWithPreview__placeholder">公式（滚动到可见区域后渲染）</p>
        )}
        {error && !html && inView && (
          <p className="MuledCodeBlockWithPreview__error">{error}</p>
        )}
        {!error && !html && inView && !code.trim() && (
          <p className="MuledCodeBlockWithPreview__empty">空公式</p>
        )}
        {html && (
          // eslint-disable-next-line react/no-danger -- MathJax HTML
          <div dangerouslySetInnerHTML={{ __html: html }} />
        )}
      </div>
    </div>
  );
}
