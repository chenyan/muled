import {
  isHtmlPreviewPath,
  resolveHtmlPreviewLinkUrl,
  resolveHtmlPreviewLoadTarget,
  resolveHtmlPreviewNavigateHref,
  workspaceRelativeFromAbsolute,
} from '../renderer/lib/htmlPreviewNavigate';

describe('htmlPreviewNavigate', () => {
  const workspaceRoot = '/Users/cy/projects/sicp-cn';

  it('resolves muled-file html links to workspace relative paths', () => {
    expect(
      resolveHtmlPreviewNavigateHref(
        'muled-file:///Users/cy/projects/sicp-cn/html/book-Z-H-1.html',
        workspaceRoot,
      ),
    ).toBe('html/book-Z-H-1.html');
    expect(
      resolveHtmlPreviewNavigateHref(
        'muled-file://Users/cy/projects/sicp-cn/html/book-Z-H-1.html',
        workspaceRoot,
      ),
    ).toBe('html/book-Z-H-1.html');
  });

  it('falls back to absolute read path outside workspace-relative mapping', () => {
    const target = resolveHtmlPreviewLoadTarget(
      'muled-file:///tmp/other/page.html',
      workspaceRoot,
    );
    expect(target?.readPath).toBe('/tmp/other/page.html');
  });

  it('rejects non-html files', () => {
    expect(
      resolveHtmlPreviewLoadTarget(
        'muled-file:///Users/cy/projects/sicp-cn/html/css/style.css',
        workspaceRoot,
      ),
    ).toBeNull();
  });

  it('identifies html preview paths', () => {
    expect(isHtmlPreviewPath('book.html')).toBe(true);
    expect(isHtmlPreviewPath('book.xhtml')).toBe(true);
    expect(isHtmlPreviewPath('book.htm')).toBe(true);
    expect(isHtmlPreviewPath('style.css')).toBe(false);
  });

  it('maps absolute paths back to workspace relatives', () => {
    expect(
      workspaceRelativeFromAbsolute(
        workspaceRoot,
        '/Users/cy/projects/sicp-cn/html/book-Z-H-1.html',
      ),
    ).toBe('html/book-Z-H-1.html');
  });

  it('resolves relative links against preview base', () => {
    expect(
      resolveHtmlPreviewLinkUrl(
        'book-Z-H-2.html',
        'muled-file:///Users/cy/projects/sicp-cn/html/',
      ),
    ).toBe('muled-file:///Users/cy/projects/sicp-cn/html/book-Z-H-2.html');
    expect(
      resolveHtmlPreviewNavigateHref(
        'book-Z-H-2.html',
        '/Users/cy/projects/sicp-cn',
        'muled-file:///Users/cy/projects/sicp-cn/html/',
      ),
    ).toBe('html/book-Z-H-2.html');
  });

  it('preserves and decodes hash anchors for cross-page navigation', () => {
    const target = resolveHtmlPreviewLoadTarget(
      'book-Z-H-2.html#%E7%AC%AC1%E8%8A%82',
      workspaceRoot,
      'muled-file:///Users/cy/projects/sicp-cn/html/',
    );
    expect(target?.readPath).toBe('html/book-Z-H-2.html');
    expect(target?.hash).toBe('第1节');
  });

  it('preserves literal percent in sicp-style anchor names', () => {
    const target = resolveHtmlPreviewLoadTarget(
      'book-Z-H-20.html#%_sec_3.1.3',
      workspaceRoot,
      'muled-file:///Users/cy/projects/sicp-cn/html/',
    );
    expect(target?.readPath).toBe('html/book-Z-H-20.html');
    expect(target?.hash).toBe('%_sec_3.1.3');
  });

  it('falls back to absolute read path when workspace root differs', () => {
    const target = resolveHtmlPreviewLoadTarget(
      'muled-file:///Users/cy/projects/sicp-cn/html/book-Z-H-1.html',
      '/Users/cy/iCloud/sicp-cn',
    );
    expect(target?.readPath).toBe(
      '/Users/cy/projects/sicp-cn/html/book-Z-H-1.html',
    );
    expect(target?.baseHref).toBe(
      'muled-file:///Users/cy/projects/sicp-cn/html/',
    );
  });

  it('resolves parent-relative links', () => {
    expect(
      resolveHtmlPreviewLinkUrl(
        '../other/chapter.xhtml',
        'muled-file:///Users/cy/projects/sicp-cn/html/nested/',
      ),
    ).toBe('muled-file:///Users/cy/projects/sicp-cn/html/other/chapter.xhtml');
  });
});
