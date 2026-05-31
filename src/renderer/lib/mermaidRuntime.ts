import mermaid from 'mermaid';
import type { WysiwygTheme } from '../../shared/pathUtils';
import { getMermaidInitConfig } from './mermaidTheme';

let configuredTheme: WysiwygTheme | null = null;

export function configureMermaid(theme: WysiwygTheme): void {
  if (configuredTheme === theme) return;
  mermaid.initialize(getMermaidInitConfig(theme));
  configuredTheme = theme;
}

export async function renderMermaidDiagram(
  source: string,
  elementId: string,
  theme: WysiwygTheme = 'light',
): Promise<{ svg: string; error: string | null }> {
  const trimmed = source.trim();
  if (!trimmed) {
    return { svg: '', error: null };
  }
  configureMermaid(theme);
  try {
    const { svg } = await mermaid.render(elementId, trimmed);
    return { svg, error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { svg: '', error: message };
  }
}

/** @visibleForTesting */
export function resetMermaidRuntimeForTests(): void {
  configuredTheme = null;
}
