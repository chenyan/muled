import {
  type CodeBlockEditorProps,
} from '@mdxeditor/editor';
import { useEffect, useId, useRef, useState } from 'react';
import { renderMermaidDiagram } from '../../../lib/mermaidRuntime';
import useCodeBlockFocus from './useCodeBlockFocus';

export default function MermaidCodeBlockEditor({
  code,
  focusEmitter,
}: CodeBlockEditorProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const renderId = useId().replace(/:/g, '');

  useCodeBlockFocus(focusEmitter, previewRef);

  useEffect(() => {
    let cancelled = false;
    const id = `muled-mermaid-${renderId}-${Date.now()}`;
    (async () => {
      const result = await renderMermaidDiagram(code, id);
      if (cancelled) return;
      setSvg(result.svg);
      setError(result.error);
    })();
    return () => {
      cancelled = true;
    };
  }, [code, renderId]);

  return (
    <div className="MuledCodeBlockWithPreview MuledCodeBlockWithPreview--mermaidOnly">
      <div
        ref={previewRef}
        className="MuledCodeBlockWithPreview__preview MuledCodeBlockWithPreview__preview--mermaidOnly"
        tabIndex={0}
        role="img"
        aria-label="Mermaid 图表"
      >
        {error && <p className="MuledCodeBlockWithPreview__error">{error}</p>}
        {!error && !svg && !code.trim() && (
          <p className="MuledCodeBlockWithPreview__empty">空 Mermaid 图表</p>
        )}
        {!error && svg && (
          // eslint-disable-next-line react/no-danger -- Mermaid SVG
          <div dangerouslySetInnerHTML={{ __html: svg }} />
        )}
      </div>
    </div>
  );
}
