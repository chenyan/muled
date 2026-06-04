import { isExternalLinkHref, isWikiLinkHref } from '../renderer/lib/wysiwygLinkClick';

describe('wysiwyg link href helpers', () => {
  it('detects wiki links in hash-only and absolute hrefs', () => {
    expect(isWikiLinkHref('#muled-wiki:page')).toBe(true);
    expect(
      isWikiLinkHref('http://localhost:1212/index.html#muled-wiki:page'),
    ).toBe(true);
    expect(isExternalLinkHref('https://example.com')).toBe(true);
  });
});
