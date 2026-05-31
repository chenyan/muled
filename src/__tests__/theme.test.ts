import {
  DEFAULT_THEME_CONFIG,
  parseThemeConfig,
  resolveThemeConfig,
} from '../shared/types/theme';

describe('theme config', () => {
  it('parses valid theme preferences', () => {
    expect(
      parseThemeConfig({
        ui: 'dark',
        wysiwyg: 'light',
        source: 'system',
      }),
    ).toEqual({
      ui: 'dark',
      wysiwyg: 'light',
      source: 'system',
    });
  });

  it('falls back to defaults for invalid values', () => {
    expect(parseThemeConfig({ ui: 'invalid' })).toEqual(DEFAULT_THEME_CONFIG);
  });

  it('parses acme theme preference', () => {
    expect(
      parseThemeConfig({
        ui: 'acme',
        wysiwyg: 'acme',
        source: 'acme',
      }),
    ).toEqual({
      ui: 'acme',
      wysiwyg: 'acme',
      source: 'acme',
    });
  });

  it('resolves acme preference regardless of system', () => {
    expect(
      resolveThemeConfig(
        { ui: 'acme', wysiwyg: 'acme', source: 'acme' },
        true,
      ),
    ).toEqual({
      ui: 'acme',
      wysiwyg: 'acme',
      source: 'acme',
    });
  });

  it('resolves system preference from OS dark mode', () => {
    expect(resolveThemeConfig(DEFAULT_THEME_CONFIG, true)).toEqual({
      ui: 'dark',
      wysiwyg: 'dark',
      source: 'dark',
    });
    expect(resolveThemeConfig(DEFAULT_THEME_CONFIG, false)).toEqual({
      ui: 'light',
      wysiwyg: 'light',
      source: 'light',
    });
  });
});
