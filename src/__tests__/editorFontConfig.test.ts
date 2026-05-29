import {
  DEFAULT_SOURCE_FONT,
  DEFAULT_WYSIWYG_FONT,
  parseEditorFontSettings,
} from '../shared/editorFontConfig';

describe('parseEditorFontSettings', () => {
  it('uses defaults for missing block', () => {
    expect(parseEditorFontSettings(undefined, DEFAULT_SOURCE_FONT)).toEqual(
      DEFAULT_SOURCE_FONT,
    );
  });

  it('parses family and size', () => {
    expect(
      parseEditorFontSettings(
        { font_family: 'JetBrains Mono', font_size: 14 },
        DEFAULT_SOURCE_FONT,
      ),
    ).toEqual({
      font_family: 'JetBrains Mono',
      font_size: 14,
    });
  });

  it('accepts font_size as px string', () => {
    expect(
      parseEditorFontSettings({ font_size: '16px' }, DEFAULT_WYSIWYG_FONT),
    ).toMatchObject({ font_size: 16 });
  });

  it('rejects invalid size', () => {
    expect(
      parseEditorFontSettings({ font_size: 4 }, DEFAULT_SOURCE_FONT).font_size,
    ).toBe(DEFAULT_SOURCE_FONT.font_size);
  });
});
