import katex from 'katex';
import { hasKatexError, normalizeMathSource } from './normalizeMathSource';

export interface MathRenderResult {
  html: string;
  error: string | null;
}

function renderKatex(source: string, displayMode: boolean): MathRenderResult {
  const latex = normalizeMathSource(source);
  if (!latex) {
    return { html: '', error: null };
  }
  try {
    const html = katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      errorColor: '#dc2626',
      strict: 'ignore',
    });
    if (hasKatexError(html)) {
      return { html: '', error: '公式语法有误' };
    }
    return { html, error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { html: '', error: message };
  }
}

/** 块级公式预览（KaTeX） */
export default function renderMathBlock(source: string): MathRenderResult {
  return renderKatex(source, true);
}

/** 行内公式预览（KaTeX） */
export function renderMathInline(source: string): MathRenderResult {
  return renderKatex(source, false);
}
