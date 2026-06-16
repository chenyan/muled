import {
  absolutePathToMuledFileUrl,
  muledFileUrlToAbsolutePath,
} from '../shared/muledFileUrl';

describe('muledFileUrl', () => {
  const sicpChapter =
    '/Users/cy/projects/sicp-cn/html/Chapter-1.xhtml';
  const sicpCss =
    '/Users/cy/projects/sicp-cn/html/css/style.css';

  it('round-trips absolute paths', () => {
    expect(
      muledFileUrlToAbsolutePath(absolutePathToMuledFileUrl(sicpChapter)),
    ).toBe(sicpChapter);
    expect(
      muledFileUrlToAbsolutePath(absolutePathToMuledFileUrl(sicpCss)),
    ).toBe(sicpCss);
  });

  it('builds authority-empty urls for unix paths', () => {
    expect(absolutePathToMuledFileUrl(sicpChapter)).toBe(
      'muled-file:///Users/cy/projects/sicp-cn/html/Chapter-1.xhtml',
    );
  });

  it('parses authority-empty urls', () => {
    expect(
      muledFileUrlToAbsolutePath(
        'muled-file:///Users/cy/projects/sicp-cn/html/css/style.css',
      ),
    ).toBe(sicpCss);
  });

  it('parses host-based urls emitted by chromium', () => {
    expect(
      muledFileUrlToAbsolutePath(
        'muled-file://Users/cy/projects/sicp-cn/html/css/style.css',
      ),
    ).toBe(sicpCss);
    expect(
      muledFileUrlToAbsolutePath(
        'muled-file://localhost/Users/cy/projects/sicp-cn/html/css/style.css',
      ),
    ).toBe(sicpCss);
  });

  it('encodes path segments with spaces', () => {
    const spaced = '/Users/ws/my docs/page.html';
    expect(absolutePathToMuledFileUrl(spaced)).toBe(
      'muled-file:///Users/ws/my%20docs/page.html',
    );
    expect(muledFileUrlToAbsolutePath(absolutePathToMuledFileUrl(spaced))).toBe(
      spaced,
    );
  });
});
