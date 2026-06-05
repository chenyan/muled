declare module 'notebookjs' {
  interface ParsedNotebook {
    render(): HTMLElement;
  }

  interface NotebookJs {
    parse(json: unknown): ParsedNotebook;
    markdown: (text: string) => string;
    ansi: (text: string) => string;
    sanitizer: (html: string) => string;
    highlighter: (
      text: string,
      pre?: HTMLElement,
      code?: HTMLElement,
      lang?: string,
    ) => string;
    executeJavaScript: boolean;
    prefix: string;
  }

  const nb: NotebookJs;
  export default nb;
}
