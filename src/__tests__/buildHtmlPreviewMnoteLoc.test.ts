import { buildHtmlPreviewMnoteLoc } from '../renderer/lib/buildHtmlPreviewMnoteLoc';

describe('buildHtmlPreviewMnoteLoc', () => {
  it('maps selection to source line numbers when found', () => {
    const source = '<html>\n<body>\n<p>Hello world</p>\n</body>\n</html>';
    expect(buildHtmlPreviewMnoteLoc(source, 'Hello world')).toBe('lines=3');
  });

  it('falls back when selection is missing from source', () => {
    expect(buildHtmlPreviewMnoteLoc('<p>x</p>', 'preview only')).toBe(
      'preview=html',
    );
  });

  it('falls back when selection is empty', () => {
    expect(buildHtmlPreviewMnoteLoc('<p>x</p>', '   ')).toBe('preview=html');
  });
});
