import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { ThemeChangedPayload } from '../../shared/types/ipc';
import type {
  ResolvedTheme,
  ResolvedThemeConfig,
  ThemeConfig,
} from '../../shared/types/theme';
import type { WysiwygTheme } from '../../shared/pathUtils';

const STYLE_ELEMENT_ID = 'muled-wysiwyg-styles';

export type { WysiwygTheme };

interface AppThemeContextValue {
  preferences: ThemeConfig;
  resolved: ResolvedThemeConfig;
  wysiwygTheme: WysiwygTheme;
  stylePaths: { light: string; dark: string; acme: string } | null;
  applyPayload: (payload: ThemeChangedPayload) => void;
  reload: () => Promise<void>;
}

const defaultResolved: ResolvedThemeConfig = {
  ui: 'light',
  wysiwyg: 'light',
  source: 'light',
};

const AppThemeContext = createContext<AppThemeContextValue>({
  preferences: { ui: 'system', wysiwyg: 'system', source: 'system' },
  resolved: defaultResolved,
  wysiwygTheme: 'light',
  stylePaths: null,
  applyPayload: () => undefined,
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

function applyUiTheme(resolvedUi: ResolvedTheme): void {
  document.documentElement.dataset.muledUiTheme = resolvedUi;
  document.documentElement.style.colorScheme =
    resolvedUi === 'dark' ? 'dark' : 'light';
}

function applyThemePayload(payload: ThemeChangedPayload): void {
  injectWysiwygCss(payload.wysiwyg.css, payload.wysiwyg.theme);
  applyUiTheme(payload.resolved.ui);
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<ThemeConfig>({
    ui: 'system',
    wysiwyg: 'system',
    source: 'system',
  });
  const [resolved, setResolved] =
    useState<ResolvedThemeConfig>(defaultResolved);
  const [wysiwygTheme, setWysiwygTheme] = useState<WysiwygTheme>('light');
  const [stylePaths, setStylePaths] = useState<{
    light: string;
    dark: string;
    acme: string;
  } | null>(null);

  const applyPayload = useCallback((payload: ThemeChangedPayload) => {
    applyThemePayload(payload);
    setPreferences(payload.theme);
    setResolved(payload.resolved);
    setWysiwygTheme(payload.wysiwyg.theme);
    setStylePaths(payload.wysiwyg.paths);
  }, []);

  const reload = useCallback(async () => {
    if (!window.muled?.config) return;
    const [publicConfig, wysiwyg] = await Promise.all([
      window.muled.config.get(),
      window.muled.config.getWysiwygCss(),
    ]);
    applyPayload({
      theme: {
        ui: publicConfig.theme.ui,
        wysiwyg: publicConfig.theme.wysiwyg,
        source: publicConfig.theme.source,
      },
      resolved: publicConfig.theme.resolved,
      wysiwyg,
    });
  }, [applyPayload]);

  useEffect(() => {
    reload().catch(() => undefined);
  }, [reload]);

  useEffect(() => {
    if (!window.muled?.config) return undefined;
    const unsub = window.muled.config.onThemeChanged(applyPayload);
    return unsub;
  }, [applyPayload]);

  const value = useMemo(
    () => ({
      preferences,
      resolved,
      wysiwygTheme,
      stylePaths,
      applyPayload,
      reload,
    }),
    [
      preferences,
      resolved,
      wysiwygTheme,
      stylePaths,
      applyPayload,
      reload,
    ],
  );

  return (
    <AppThemeContext.Provider value={value}>
      {children}
    </AppThemeContext.Provider>
  );
}

export function useAppTheme(): AppThemeContextValue {
  return useContext(AppThemeContext);
}

export function useWysiwygTheme(): WysiwygTheme {
  return useContext(AppThemeContext).wysiwygTheme;
}

export function useSourceEditorTheme(): ResolvedTheme {
  return useContext(AppThemeContext).resolved.source;
}

export function useWysiwygStylePaths(): {
  light: string;
  dark: string;
  acme: string;
} | null {
  return useContext(AppThemeContext).stylePaths;
}

/** @deprecated 使用 AppThemeProvider */
export const WysiwygThemeProvider = AppThemeProvider;
