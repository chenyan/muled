declare module 'mathjax-full/js/mathjax.js' {
  export const mathjax: {
    document: (
      content: string,
      options: Record<string, unknown>,
    ) => {
      convert: (latex: string, options: { display: boolean }) => unknown;
    };
  };
}

declare module 'mathjax-full/js/input/tex.js' {
  export class TeX {
    constructor(options?: Record<string, unknown>);
  }
}

declare module 'mathjax-full/js/output/svg.js' {
  export class SVG {
    constructor(options?: Record<string, unknown>);
  }
}

declare module 'mathjax-full/js/adaptors/liteAdaptor.js' {
  export function liteAdaptor(): {
    outerHTML: (node: unknown) => string;
  };
}

declare module 'mathjax-full/js/handlers/html.js' {
  export function RegisterHTMLHandler(adaptor: unknown): void;
}

declare module 'mathjax-full/js/input/tex/AllPackages.js' {
  export const AllPackages: string[];
}
