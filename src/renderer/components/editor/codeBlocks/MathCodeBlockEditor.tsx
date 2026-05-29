import {
  type CodeBlockEditorProps,
  useCodeBlockEditorContext,
} from '@mdxeditor/editor';
import { useMemo, useRef } from 'react';
import renderMathBlock from '../../../lib/renderMath';
import useCodeBlockFocus, {
  useTextareaAutoHeight,
} from './useCodeBlockFocus';

export default function MathCodeBlockEditor({
  code,
  focusEmitter,
}: CodeBlockEditorProps) {
  const { setCode } = useCodeBlockEditorContext();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { html, error } = useMemo(() => renderMathBlock(code), [code]);

  useCodeBlockFocus(focusEmitter, textareaRef);
  useTextareaAutoHeight(textareaRef, code);

  return (
    <div className="MuledCodeBlockWithPreview">
      <div className="MuledCodeBlockWithPreview__editor">
        <div className="MuledCodeBlockWithPreview__label">LaTeX 公式</div>
        <textarea
          ref={textareaRef}
          className="MuledCodeBlockWithPreview__textarea"
          value={code}
          spellCheck={false}
          onChange={(e) => setCode(e.target.value)}
        />
      </div>
      <div className="MuledCodeBlockWithPreview__preview MuledCodeBlockWithPreview__preview--math">
        {error && <p className="MuledCodeBlockWithPreview__error">{error}</p>}
        {!error && !html && !code.trim() && (
          <p className="MuledCodeBlockWithPreview__empty">
            输入 LaTeX（块级公式，无需 $$ 包裹）
          </p>
        )}
        {!error && html && (
          // eslint-disable-next-line react/no-danger -- KaTeX HTML
          <div dangerouslySetInnerHTML={{ __html: html }} />
        )}
      </div>
    </div>
  );
}
