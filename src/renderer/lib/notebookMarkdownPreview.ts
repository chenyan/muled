import DOMPurify from 'dompurify';
import renderMathInElement from 'katex/contrib/auto-render';
import { marked } from 'marked';
import type { WysiwygTheme } from '../../shared/pathUtils';
import { renderMermaidDiagram } from './mermaidRuntime';
import { NOTEBOOK_MATH_DELIMITERS } from './notebookMath';

/** 与 notebookjs markdown cell 一致：先 KaTeX，再 marked */
export function renderNotebookMarkdownHtml(source: string): string {
  const staging = document.createElement('div');
  staging.innerHTML = DOMPurify.sanitize(source);
  renderMathInElement(staging, {
    delimiters: [...NOTEBOOK_MATH_DELIMITERS],
    throwOnError: false,
    errorColor: '#cc0000',
    strict: 'ignore',
  });
  return marked.parse(staging.innerHTML.replace(/&gt;/g, '>'), {
    async: false,
  }) as string;
}

export function renderNotebookMathInElement(root: HTMLElement): void {
  renderMathInElement(root, {
    delimiters: [...NOTEBOOK_MATH_DELIMITERS],
    throwOnError: false,
    errorColor: '#cc0000',
    strict: 'ignore',
  });
}

function mermaidCodeBlocks(root: HTMLElement): HTMLPreElement[] {
  const blocks: HTMLPreElement[] = [];
  root.querySelectorAll('pre > code').forEach((codeEl) => {
    const langClass = [...codeEl.classList].find((c) =>
      c.startsWith('language-'),
    );
    const lang = langClass?.slice('language-'.length).toLowerCase();
    if (lang !== 'mermaid') return;
    const pre = codeEl.parentElement;
    if (pre instanceof HTMLPreElement) {
      blocks.push(pre);
    }
  });
  return blocks;
}

/** 将 markdown 中的 ```mermaid 代码块替换为 SVG 图 */
export async function renderNotebookMermaidInElement(
  root: HTMLElement,
  theme: WysiwygTheme = 'light',
): Promise<void> {
  const blocks = mermaidCodeBlocks(root);
  let index = 0;
  for (const pre of blocks) {
    if (!pre.isConnected) continue;
    const source = pre.textContent ?? '';
    const id = `muled-notebook-mermaid-${Date.now()}-${index++}`;
    const result = await renderMermaidDiagram(source, id, theme);
    if (!pre.isConnected) continue;
    const wrapper = document.createElement('div');
    wrapper.className = 'IpynbMarkdownMermaid';
    if (result.error) {
      const err = document.createElement('pre');
      err.className = 'IpynbMarkdownMermaid__error';
      err.textContent = result.error;
      wrapper.appendChild(err);
    } else if (result.svg) {
      wrapper.innerHTML = result.svg;
    } else {
      continue;
    }
    pre.replaceWith(wrapper);
  }
}

export async function enhanceNotebookMarkdownElement(
  root: HTMLElement,
  theme: WysiwygTheme = 'light',
  options?: { math?: boolean; mermaid?: boolean },
): Promise<void> {
  const { math = true, mermaid = true } = options ?? {};
  if (math) {
    renderNotebookMathInElement(root);
  }
  if (mermaid) {
    await renderNotebookMermaidInElement(root, theme);
  }
}
