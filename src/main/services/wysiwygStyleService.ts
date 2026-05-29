import fs from 'fs';
import { nativeTheme } from 'electron';
import DEFAULT_DARK_CSS from '../../shared/wysiwyg/defaultDarkCss';
import DEFAULT_LIGHT_CSS from '../../shared/wysiwyg/defaultLightCss';
import {
  ensureParentDir,
  getWysiwygStyleDir,
  getWysiwygStylePath,
  type WysiwygTheme,
} from '../../shared/pathUtils';

const DEFAULT_CSS: Record<WysiwygTheme, string> = {
  light: DEFAULT_LIGHT_CSS,
  dark: DEFAULT_DARK_CSS,
};

export function resolveWysiwygTheme(): WysiwygTheme {
  return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
}

export function ensureWysiwygStyleFiles(): void {
  const dir = getWysiwygStyleDir();
  fs.mkdirSync(dir, { recursive: true });

  (['light', 'dark'] as const).forEach((theme) => {
    const filePath = getWysiwygStylePath(theme);
    if (!fs.existsSync(filePath)) {
      ensureParentDir(filePath);
      fs.writeFileSync(filePath, DEFAULT_CSS[theme], 'utf8');
    }
  });
}

export function readWysiwygCss(theme: WysiwygTheme): string {
  ensureWysiwygStyleFiles();
  const filePath = getWysiwygStylePath(theme);
  return fs.readFileSync(filePath, 'utf8');
}

export function getWysiwygStylePaths(): Record<WysiwygTheme, string> {
  ensureWysiwygStyleFiles();
  return {
    light: getWysiwygStylePath('light'),
    dark: getWysiwygStylePath('dark'),
  };
}
