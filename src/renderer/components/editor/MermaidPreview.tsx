import { useEffect, useId, useState } from 'react';
import { useWysiwygTheme } from '../../hooks/useAppTheme';
import { renderMermaidDiagram } from '../../lib/mermaidRuntime';
import type { EditorTab } from '../../types/tab';

interface MermaidPreviewProps {
  tab: EditorTab;
}

export default function MermaidPreview({ tab }: MermaidPreviewProps) {
  const [svg, setSvg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const renderId = useId().replace(/:/g, '');
  const wysiwygTheme = useWysiwygTheme();

  useEffect(() => {
    let cancelled = false;
    const id = `muled-mermaid-file-${renderId}-${Date.now()}`;
    (async () => {
      const result = await renderMermaidDiagram(
        tab.content,
        id,
        wysiwygTheme,
      );
      if (cancelled) return;
      setSvg(result.svg);
      setError(result.error);
    })();
    return () => {
      cancelled = true;
    };
  }, [tab.content, renderId, wysiwygTheme]);

  const trimmed = tab.content.trim();

  return (
    <div className="MermaidPreview" role="img" aria-label="Mermaid 图表">
      {error ? <pre className="MermaidPreview__error">{error}</pre> : null}
      {!error && !trimmed ? (
        <p className="MermaidPreview__empty">空 Mermaid 图表</p>
      ) : null}
      {!error && svg ? (
        // eslint-disable-next-line react/no-danger -- Mermaid SVG
        <div
          className="MermaidPreview__diagram"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : null}
    </div>
  );
}
