import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

const STYLE_ELEMENT_ID = 'muled-wysiwyg-styles';

export type WysiwygTheme = 'light' | 'dark';

interface WysiwygThemeContextValue {
  theme: WysiwygTheme;
  stylePaths: { light: string; dark: string } | null;
  reload: () => Promise<void>;
}

const WysiwygThemeContext = createContext<WysiwygThemeContextValue>({
  theme: 'light',
  stylePaths: null,
  reload: async () => undefined,
});

function injectWysiwygCss(css: string, theme: WysiwygTheme): void {
  let el = document.getElementById(STYLE_ELEMENT_ID);
  if (!el) {
    el = document.createElement('style');
    el.id = STYLE_ELEMENT_ID;
    document.head.appendChild(el);
  }
  el.textContent = css;
  document.documentElement.dataset.muledWysiwygTheme = theme;
}

export function WysiwygThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<WysiwygTheme>('light');
  const [stylePaths, setStylePaths] = useState<{
    light: string;
    dark: string;
  } | null>(null);

  const applyStyles = useCallback((css: string, nextTheme: WysiwygTheme) => {
    injectWysiwygCss(css, nextTheme);
    setTheme(nextTheme);
  }, []);

  const reload = useCallback(async () => {
    if (!window.muled?.config) return;
    const result = await window.muled.config.getWysiwygCss();
    applyStyles(result.css, result.theme);
    setStylePaths(result.paths);
  }, [applyStyles]);

  useEffect(() => {
    reload().catch(() => undefined);
  }, [reload]);

  useEffect(() => {
    if (!window.muled?.config) return undefined;
    const unsub = window.muled.config.onWysiwygThemeChanged(
      ({ css, theme: next }) => {
        applyStyles(css, next);
      },
    );
    return unsub;
  }, [applyStyles]);

  const value = useMemo(
    () => ({ theme, stylePaths, reload }),
    [theme, stylePaths, reload],
  );

  return (
    <WysiwygThemeContext.Provider value={value}>
      {children}
    </WysiwygThemeContext.Provider>
  );
}

export function useWysiwygTheme(): WysiwygTheme {
  return useContext(WysiwygThemeContext).theme;
}

export function useWysiwygStylePaths(): {
  light: string;
  dark: string;
} | null {
  return useContext(WysiwygThemeContext).stylePaths;
}
