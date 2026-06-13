import DEFAULT_ACME_CSS from '../../shared/wysiwyg/defaultAcmeCss';
import DEFAULT_DARK_CSS from '../../shared/wysiwyg/defaultDarkCss';
import DEFAULT_LIGHT_CSS from '../../shared/wysiwyg/defaultLightCss';
import {
  WYSIWYG_DARK_PALETTE_VERSION,
} from '../../shared/sourceDarkPalette';
import fs from 'fs';
import {
  ensureParentDir,
  getWysiwygStyleDir,
  getWysiwygStylePath,
  type WysiwygTheme,
} from '../../shared/pathUtils';

const DEFAULT_CSS: Record<WysiwygTheme, string> = {
  light: DEFAULT_LIGHT_CSS,
  dark: DEFAULT_DARK_CSS,
  acme: DEFAULT_ACME_CSS,
};

/** 当前 dark 调色板版本；缺失或旧版时自动覆盖为内置默认 */
const DARK_CSS_PALETTE_VERSION = `--wysiwyg-palette: ${WYSIWYG_DARK_PALETTE_VERSION}`;

const ACME_CSS_PALETTE_VERSION = '--wysiwyg-palette: 5';

const LIGHT_CSS_PALETTE_VERSION = '--wysiwyg-palette: 2';

function maybeUpgradeLightCss(filePath: string): string {
  const content = fs.readFileSync(filePath, 'utf8');
  if (content.includes(LIGHT_CSS_PALETTE_VERSION)) {
    return content;
  }
  fs.writeFileSync(filePath, DEFAULT_CSS.light, 'utf8');
  return DEFAULT_CSS.light;
}

function maybeUpgradeAcmeCss(filePath: string): string {
  const content = fs.readFileSync(filePath, 'utf8');
  if (content.includes(ACME_CSS_PALETTE_VERSION)) {
    return content;
  }
  fs.writeFileSync(filePath, DEFAULT_CSS.acme, 'utf8');
  return DEFAULT_CSS.acme;
}

function maybeUpgradeDarkCss(filePath: string): string {
  const content = fs.readFileSync(filePath, 'utf8');
  if (content.includes(DARK_CSS_PALETTE_VERSION)) {
    return content;
  }
  fs.writeFileSync(filePath, DEFAULT_CSS.dark, 'utf8');
  return DEFAULT_CSS.dark;
}

export function ensureWysiwygStyleFiles(): void {
  const dir = getWysiwygStyleDir();
  fs.mkdirSync(dir, { recursive: true });

  (['light', 'dark', 'acme'] as const).forEach((theme) => {
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
  if (theme === 'dark') {
    return maybeUpgradeDarkCss(filePath);
  }
  if (theme === 'acme') {
    return maybeUpgradeAcmeCss(filePath);
  }
  if (theme === 'light') {
    return maybeUpgradeLightCss(filePath);
  }
  return fs.readFileSync(filePath, 'utf8');
}

export function getWysiwygStylePaths(): Record<WysiwygTheme, string> {
  ensureWysiwygStyleFiles();
  return {
    light: getWysiwygStylePath('light'),
    dark: getWysiwygStylePath('dark'),
    acme: getWysiwygStylePath('acme'),
  };
}
