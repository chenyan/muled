import { nativeTheme } from 'electron';
import type {
  ResolvedThemeConfig,
  ThemeConfig,
} from '../../shared/types/theme';
import { resolveThemeConfig } from '../../shared/types/theme';

export function systemPrefersDark(): boolean {
  return nativeTheme.shouldUseDarkColors;
}

export function resolveThemes(config: ThemeConfig): ResolvedThemeConfig {
  return resolveThemeConfig(config, systemPrefersDark());
}
