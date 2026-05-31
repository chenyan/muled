export type ThemePreference = 'system' | 'light' | 'dark' | 'acme';
export type ResolvedTheme = 'light' | 'dark' | 'acme';

export interface ThemeConfig {
  /** 应用壳层（侧栏、标签栏、状态栏等） */
  ui: ThemePreference;
  /** WYSIWYG 富文本样式（~/.config/muled/wysiwyg/*.css） */
  wysiwyg: ThemePreference;
  /** 源码编辑器 CodeMirror 主题 */
  source: ThemePreference;
}

export interface ResolvedThemeConfig {
  ui: ResolvedTheme;
  wysiwyg: ResolvedTheme;
  source: ResolvedTheme;
}

export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  ui: 'system',
  wysiwyg: 'system',
  source: 'system',
};

export function parseThemePreference(
  value: unknown,
  fallback: ThemePreference,
): ThemePreference {
  if (value === 'system' || value === 'light' || value === 'dark' || value === 'acme') {
    return value;
  }
  return fallback;
}

export function parseThemeConfig(raw: unknown): ThemeConfig {
  const data = (raw && typeof raw === 'object' ? raw : {}) as Record<
    string,
    unknown
  >;
  return {
    ui: parseThemePreference(data.ui, DEFAULT_THEME_CONFIG.ui),
    wysiwyg: parseThemePreference(data.wysiwyg, DEFAULT_THEME_CONFIG.wysiwyg),
    source: parseThemePreference(data.source, DEFAULT_THEME_CONFIG.source),
  };
}

export function resolveThemePreference(
  preference: ThemePreference,
  systemDark: boolean,
): ResolvedTheme {
  if (preference === 'acme') return 'acme';
  if (preference === 'light') return 'light';
  if (preference === 'dark') return 'dark';
  return systemDark ? 'dark' : 'light';
}

export function resolveThemeConfig(
  config: ThemeConfig,
  systemDark: boolean,
): ResolvedThemeConfig {
  return {
    ui: resolveThemePreference(config.ui, systemDark),
    wysiwyg: resolveThemePreference(config.wysiwyg, systemDark),
    source: resolveThemePreference(config.source, systemDark),
  };
}
