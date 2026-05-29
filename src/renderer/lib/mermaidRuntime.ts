import mermaid from 'mermaid';

let initialized = false;

export function ensureMermaidInitialized(): void {
  if (initialized) return;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'neutral',
  });
  initialized = true;
}

export async function renderMermaidDiagram(
  source: string,
  elementId: string,
): Promise<{ svg: string; error: string | null }> {
  const trimmed = source.trim();
  if (!trimmed) {
    return { svg: '', error: null };
  }
  ensureMermaidInitialized();
  try {
    const { svg } = await mermaid.render(elementId, trimmed);
    return { svg, error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { svg: '', error: message };
  }
}
