import {
  buildHtmlPreviewDocument,
  htmlPreviewBaseHref,
  htmlPreviewFileUrl,
  toMuledFileUrl,
} from '../renderer/lib/htmlPreviewDocument';

describe('htmlPreviewDocument', () => {
  it('builds a document with base href for fragments', () => {
    const doc = buildHtmlPreviewDocument(
      '<p>Hello</p>',
      'muled-file:///tmp/workspace/docs/',
    );
    expect(doc).toContain('<base href="muled-file:///tmp/workspace/docs/">');
    expect(doc).toContain('<p>Hello</p>');
  });

  it('injects preview bridge script for iframe context menu', () => {
    const doc = buildHtmlPreviewDocument(
      '<p>Hello</p>',
      'muled-file:///tmp/workspace/docs/',
    );
    expect(doc).toContain('muled-html-preview-contextmenu');
    expect(doc).toContain('muled-html-preview-navigate');
    expect(doc).toContain('muled-html-preview-wheel');
    expect(doc).toContain('e.preventDefault()');
  });

  it('injects base into existing html head', () => {
    const doc = buildHtmlPreviewDocument(
      '<html><head><title>T</title></head><body></body></html>',
      'muled-file:///tmp/',
    );
    expect(doc).toContain('<head><base href="muled-file:///tmp/">');
  });

  it('resolves preview base href from file directory, not workspace root', () => {
    expect(
      htmlPreviewBaseHref('/Users/ws', 'pages/index.html'),
    ).toBe('muled-file:///Users/ws/pages/');
    expect(
      htmlPreviewBaseHref('/Users/ws', 'pages/nested/index.html'),
    ).toBe('muled-file:///Users/ws/pages/nested/');
  });

  it('resolves preview file url for direct iframe loading', () => {
    expect(
      htmlPreviewFileUrl('/Users/ws', 'pages/nested/index.html'),
    ).toBe('muled-file:///Users/ws/pages/nested/index.html');
  });

  it('encodes path segments with spaces', () => {
    expect(toMuledFileUrl('/Users/ws/my docs/page.html')).toBe(
      'muled-file:///Users/ws/my%20docs/page.html',
    );
  });
});
