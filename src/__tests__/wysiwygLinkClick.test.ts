import {
  isExternalLinkHref,
  isLinkOpenModifier,
  isWikiLinkHref,
  wikiLinkTitleFromHref,
} from '../renderer/lib/wysiwygLinkClick';
import { WIKI_LINK_SRC_PREFIX } from '../renderer/lib/normalizeMarkdownWikiLinks';

describe('wysiwygLinkClick', () => {
  it('detects link open modifier', () => {
    expect(isLinkOpenModifier({ ctrlKey: true, metaKey: false } as MouseEvent)).toBe(
      true,
    );
    expect(isLinkOpenModifier({ ctrlKey: false, metaKey: true } as MouseEvent)).toBe(
      true,
    );
    expect(isLinkOpenModifier({ ctrlKey: false, metaKey: false } as MouseEvent)).toBe(
      false,
    );
  });

  it('detects external and wiki hrefs', () => {
    expect(isExternalLinkHref('https://example.com')).toBe(true);
    expect(isExternalLinkHref('mailto:a@b.c')).toBe(true);
    expect(isExternalLinkHref('notes/page.md')).toBe(false);
    expect(isWikiLinkHref(`${WIKI_LINK_SRC_PREFIX}page`)).toBe(true);
  });

  it('decodes wiki link title from href', () => {
    expect(
      wikiLinkTitleFromHref(`${WIKI_LINK_SRC_PREFIX}${encodeURIComponent('我的页面')}`),
    ).toBe('我的页面');
  });
});
