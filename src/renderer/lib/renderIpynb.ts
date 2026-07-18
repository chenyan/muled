import type { IpynbOutput } from '../../shared/types/ipynb';
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

export function renderIpynbOutputsToElement(outputs: IpynbOutput[]): HTMLElement {
  configureNotebookJs();
  const container = document.createElement('div');
  container.className = 'IpynbCellOutput__list';
  if (!outputs.length) return container;

  try {
    const json = {
      nbformat: 4,
      nbformat_minor: 5,
      metadata: {},
      cells: [
        {
          cell_type: 'code',
          source: [''],
          outputs,
          execution_count: null,
          metadata: {},
        },
      ],
    };
    const notebook = nb.parse(json);
    const root = notebook.render();
    const codeCell = root.querySelector('.nb-code-cell');
    if (!codeCell) return container;
    codeCell.querySelector('.nb-input')?.remove();
    container.append(...Array.from(codeCell.childNodes));
    return container;
  } catch {
    return container;
  }
}
