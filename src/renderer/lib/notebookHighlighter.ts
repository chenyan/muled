import Prism from 'prismjs';

// 按依赖顺序加载：extend 目标语言必须先于子语言注册
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-julia';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-r';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-scheme';
import 'prismjs/components/prism-lisp';

const LANG_ALIASES: Record<string, string> = {
  python3: 'python',
  ipython: 'python',
  py: 'python',
  js: 'javascript',
  node: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  console: 'bash',
  rc: 'r',
  jl: 'julia',
  cpp: 'cpp',
  'c++': 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  h: 'cpp',
  hpp: 'cpp',
  golang: 'go',
  rs: 'rust',
  yml: 'yaml',
  md: 'markdown',
  text: 'plain',
  plain: 'plain',
  scm: 'scheme',
  rkt: 'racket',
  elisp: 'lisp',
  'emacs-lisp': 'lisp',
  commonlisp: 'lisp',
  cl: 'lisp',
};

export function normalizeNotebookLanguage(lang?: string): string | null {
  if (!lang) return null;
  const key = lang.trim().toLowerCase();
  if (!key) return null;
  const mapped = LANG_ALIASES[key] ?? key;
  if (mapped === 'plain') return null;
  return Prism.languages[mapped] ? mapped : null;
}

/** notebookjs highlighter：Prism 高亮代码单元格 */
export function highlightNotebookCode(
  text: string,
  pre?: HTMLElement,
  code?: HTMLElement,
  lang?: string,
): string {
  const language = normalizeNotebookLanguage(lang);
  if (pre) {
    pre.className = language ? `language-${language}` : '';
  }
  if (code) {
    code.className = language ? `language-${language}` : '';
  }
  if (!language) return text;

  try {
    return Prism.highlight(text, Prism.languages[language], language);
  } catch {
    return text;
  }
}

function highlightCodeElement(el: HTMLElement): void {
  const langClass = [...el.classList].find((c) => c.startsWith('language-'));
  const rawLang = langClass?.slice('language-'.length);
  const language = normalizeNotebookLanguage(rawLang);
  if (!language) return;

  el.className = `language-${language}`;
  try {
    el.innerHTML = Prism.highlight(
      el.textContent ?? '',
      Prism.languages[language],
      language,
    );
  } catch {
    // 保留原文
  }
}

/** Markdown 单元格中 marked 生成的 fenced code */
export function highlightNotebookMarkdownCodeBlocks(root: HTMLElement): void {
  root.querySelectorAll('.nb-markdown-cell pre code').forEach((node) => {
    highlightCodeElement(node as HTMLElement);
  });
}

/** 预览 HTML 片段中的代码块（Org / Markdown 等） */
export function highlightHtmlCodeBlocks(html: string, selector = 'pre code'): string {
  if (typeof DOMParser === 'undefined') return html;

  const doc = new DOMParser().parseFromString(
    `<div data-org-preview-root>${html}</div>`,
    'text/html',
  );
  const root = doc.querySelector('[data-org-preview-root]');
  if (!root) return html;

  root.querySelectorAll(selector).forEach((node) => {
    highlightCodeElement(node as HTMLElement);
  });

  return root.innerHTML;
}
