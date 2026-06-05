import {
  buildHtmlPreviewDocument,
  htmlPreviewBaseHref,
} from '../renderer/lib/htmlPreviewDocument';

describe('htmlPreviewDocument', () => {
  it('builds a document with base href for fragments', () => {
    const doc = buildHtmlPreviewDocument(
      '<p>Hello</p>',
      'file:///tmp/workspace/docs/',
    );
    expect(doc).toContain('<base href="file:///tmp/workspace/docs/">');
    expect(doc).toContain('<p>Hello</p>');
  });

  it('injects base into existing html head', () => {
    const doc = buildHtmlPreviewDocument(
      '<html><head><title>T</title></head><body></body></html>',
      'file:///tmp/',
    );
    expect(doc).toContain('<head><base href="file:///tmp/">');
  });

  it('resolves preview base href from workspace path', () => {
    expect(
      htmlPreviewBaseHref('/Users/ws', 'pages/index.html'),
    ).toBe('file:///Users/ws/pages/');
  });
});
