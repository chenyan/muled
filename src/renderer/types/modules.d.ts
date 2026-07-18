declare module 'katex/contrib/auto-render' {
  interface RenderOptions {
    delimiters?: Array<{ left: string; right: string; display: boolean }>;
    throwOnError?: boolean;
    errorColor?: string;
    strict?: string | boolean;
    ignoredTags?: string[];
  }

  export default function renderMathInElement(
    element: HTMLElement,
    options?: RenderOptions,
  ): void;
}

declare module '*.wasm' {
  const url: string;
  export default url;
}

declare module 'cm6-theme-basic-light' {
  import type { Extension } from '@codemirror/state';

  export const basicLight: Extension | readonly Extension[];
  export const basicLightTheme: Extension;
  export const basicLightHighlightStyle: unknown;
}

declare module 'cm6-theme-basic-dark' {
  import type { Extension } from '@codemirror/state';

  export const basicDark: Extension | readonly Extension[];
  export const basicDarkTheme: Extension;
  export const basicDarkHighlightStyle: unknown;
}

declare module 'plotly.js/dist/plotly' {
  const Plotly: {
    newPlot: (
      root: HTMLElement,
      data: Record<string, unknown>[],
      layout: Record<string, unknown>,
      config?: Record<string, unknown>,
    ) => Promise<void>;
    react: (
      root: HTMLElement,
      data: Record<string, unknown>[],
      layout: Record<string, unknown>,
      config?: Record<string, unknown>,
    ) => Promise<void>;
    purge: (root: HTMLElement) => void;
  };
  export default Plotly;
}

interface NotebookMathDelimiter {
  left: string;
  right: string;
  display: boolean;
}

interface Window {
  renderMathInElement?: (
    element: HTMLElement,
    options?: { delimiters?: NotebookMathDelimiter[] },
  ) => void;
}
