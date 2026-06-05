import renderMathInElement from 'katex/contrib/auto-render';

/** notebookjs / nbpreview 使用的 LaTeX 分隔符 */
export const NOTEBOOK_MATH_DELIMITERS = [
  { left: '$$', right: '$$', display: true },
  { left: '\\[', right: '\\]', display: true },
  { left: '\\(', right: '\\)', display: false },
  { left: '$', right: '$', display: false },
] as const;

let installed = false;

/** 在 window 上安装 KaTeX auto-render，供 notebookjs 渲染 Markdown / LaTeX 输出 */
export function installNotebookMathRenderer(): void {
  if (installed) return;

  window.renderMathInElement = (element, options) => {
    renderMathInElement(element, {
      delimiters: options?.delimiters ?? [...NOTEBOOK_MATH_DELIMITERS],
      throwOnError: false,
      errorColor: '#cc0000',
      strict: 'ignore',
    });
  };

  installed = true;
}
