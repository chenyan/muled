import { getMathJaxDocument } from './mathjaxDocument';
import { normalizeMathSource } from './normalizeMathSource';

export interface MathRenderResult {
  html: string;
  error: string | null;
}

/** MathJax 软错误（如非法命令）仍可能返回 HTML */
export function isMathJaxErrorHtml(html: string): boolean {
  return (
    html.includes('fill="red"') ||
    html.includes('data-mjx-error') ||
    html.includes('<merror')
  );
}

function renderMathJax(source: string, displayMode: boolean): MathRenderResult {
  const latex = normalizeMathSource(source);
  if (!latex) {
    return { html: '', error: null };
  }
  try {
    const { doc, adaptor } = getMathJaxDocument();
    const node = doc.convert(latex, { display: displayMode });
    const html = adaptor.outerHTML(node);
    return { html, error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { html: '', error: message };
  }
}

/** 块级公式预览（MathJax） */
export default function renderMathBlock(source: string): MathRenderResult {
  return renderMathJax(source, true);
}

/** 行内公式预览（MathJax） */
export function renderMathInline(source: string): MathRenderResult {
  return renderMathJax(source, false);
}
