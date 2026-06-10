import p5 from 'p5';
import { useEffect, useRef, useState } from 'react';
import { compileP5Sketch } from '../../lib/p5SketchRunner';
import type { EditorTab } from '../../types/tab';

interface P5PreviewProps {
  tab: EditorTab;
}

export default function P5Preview({ tab }: P5PreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<p5 | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    setError(null);
    container.replaceChildren();

    try {
      const sketch = compileP5Sketch(tab.content, setError);
      instanceRef.current = new p5(sketch, container);
    } catch (err) {
      const message =
        err instanceof Error ? err.stack ?? err.message : String(err);
      setError(message);
    }

    return () => {
      instanceRef.current?.remove();
      instanceRef.current = null;
      container.replaceChildren();
    };
  }, [tab.content]);

  return (
    <div className="P5Preview">
      {error ? <pre className="P5Preview__error">{error}</pre> : null}
      <div ref={containerRef} className="P5Preview__canvas" />
    </div>
  );
}
