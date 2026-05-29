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
