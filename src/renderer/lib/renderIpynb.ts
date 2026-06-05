import nb from 'notebookjs';
import { AnsiUp } from 'ansi_up';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { installNotebookMathRenderer } from './notebookMath';
import {
  highlightNotebookCode,
  highlightNotebookMarkdownCodeBlocks,
} from './notebookHighlighter';

let configured = false;

function configureNotebookJs(): void {
  if (configured) return;
  installNotebookMathRenderer();
  nb.markdown = (text: string) => marked.parse(text, { async: false }) as string;
  const ansiUp = new AnsiUp();
  nb.ansi = (text: string) => ansiUp.ansi_to_html(text);
  nb.sanitizer = (html: string) => DOMPurify.sanitize(html);
  nb.highlighter = highlightNotebookCode;
  configured = true;
}

export class IpynbRenderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IpynbRenderError';
  }
}

export function renderIpynbToElement(content: string): HTMLElement {
  configureNotebookJs();

  let json: unknown;
  try {
    json = JSON.parse(content);
  } catch {
    throw new IpynbRenderError('无效的 Jupyter Notebook JSON');
  }

  try {
    const notebook = nb.parse(json);
    const root = notebook.render();
    highlightNotebookMarkdownCodeBlocks(root);
    return root;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    throw new IpynbRenderError(`无法渲染 Notebook: ${message}`);
  }
}
