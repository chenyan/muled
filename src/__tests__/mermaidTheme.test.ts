import {
  getMermaidInitConfig,
  MERMAID_ACME_THEME_VARIABLES,
  MERMAID_DARK_THEME_VARIABLES,
} from '../renderer/lib/mermaidTheme';
import { ACME_PALETTE as A } from '../shared/acmePalette';
import { SOURCE_DARK_PALETTE as P } from '../shared/sourceDarkPalette';

describe('mermaidTheme', () => {
  it('uses neutral theme for light WYSIWYG', () => {
    expect(getMermaidInitConfig('light')).toEqual({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: 'neutral',
    });
  });

  it('uses base theme with dark palette for dark WYSIWYG', () => {
    const config = getMermaidInitConfig('dark');
    expect(config.theme).toBe('base');
    expect(config.themeVariables?.darkMode).toBe(true);
    expect(config.themeVariables?.background).toBe(P.bg);
    expect(config.themeVariables?.primaryTextColor).toBe(P.fg);
  });

  it('uses base theme with acme palette for acme WYSIWYG', () => {
    const config = getMermaidInitConfig('acme');
    expect(config.theme).toBe('base');
    expect(config.themeVariables?.background).toBe(A.bg);
    expect(config.themeVariables?.primaryTextColor).toBe(A.fg);
    expect(MERMAID_ACME_THEME_VARIABLES.defaultLinkColor).toBe(A.link);
  });

  it('keeps dark theme variables aligned with wysiwyg tokens', () => {
    expect(MERMAID_DARK_THEME_VARIABLES.defaultLinkColor).toBe(P.link);
    expect(MERMAID_DARK_THEME_VARIABLES.titleColor).toBe(P.heading);
  });
});
