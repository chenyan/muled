import {
  exportWikiLinkMarkdown,
  exportWikiLinksFromMarkdown,
  normalizeMarkdownWikiLinks,
  WIKI_LINK_SRC_PREFIX,
} from '../renderer/lib/normalizeMarkdownWikiLinks';
import { exportMarkdownFromWysiwyg } from '../renderer/lib/normalizeMarkdownWikiImages';
import {
  rankWikiLinkMatches,
  wikiPageBasename,
} from '../renderer/lib/searchFdOnce';
import type { FdSearchMatch } from '../shared/types/search';

describe('normalizeMarkdownWikiLinks', () => {
  it('converts wiki link syntax to internal markdown link', () => {
    const source = 'see [[My Page]] for details';
    expect(normalizeMarkdownWikiLinks(source)).toBe(
      `see [My Page](${WIKI_LINK_SRC_PREFIX}${encodeURIComponent('My Page')}) for details`,
    );
  });

  it('supports alias pipe syntax', () => {
    const normalized = normalizeMarkdownWikiLinks('[[target|display]]');
    expect(normalized).toBe(
      `[display](${WIKI_LINK_SRC_PREFIX}${encodeURIComponent('target')})`,
    );
    expect(exportWikiLinksFromMarkdown(normalized)).toBe('[[target|display]]');
  });

  it('does not convert wiki image embeds', () => {
    const source = '![[image.png]] and [[page]]';
    expect(normalizeMarkdownWikiLinks(source)).toBe(
      `![[image.png]] and [page](${WIKI_LINK_SRC_PREFIX}page)`,
    );
  });

  it('exports legacy internal wiki links back to wiki syntax', () => {
    const markdown = '[title](muled-wiki-link:title)';
    expect(exportWikiLinksFromMarkdown(markdown)).toBe('[[title]]');
  });

  it('exportMarkdownFromWysiwyg strips leaked muled-wiki-link from stored text', () => {
    const stored = `before [x](${WIKI_LINK_SRC_PREFIX}x) after`;
    expect(exportMarkdownFromWysiwyg(stored)).toBe('before [[x]] after');
  });
});

describe('exportWikiLinkMarkdown', () => {
  it('formats alias pipe suffix', () => {
    expect(exportWikiLinkMarkdown('target', 'label')).toBe('[[target|label]]');
  });
});

describe('rankWikiLinkMatches', () => {
  const fd = (path: string): FdSearchMatch => ({
    kind: 'fd',
    path,
    absolutePath: `/ws/${path}`,
  });

  it('prefers exact basename matches and filters non-markdown files', () => {
    const ranked = rankWikiLinkMatches('Notes', [
      fd('docs/readme.txt'),
      fd('archive/Notes.md'),
      fd('Notes copy.md'),
    ]);
    expect(ranked.map((item) => item.path)).toEqual([
      'archive/Notes.md',
      'Notes copy.md',
    ]);
  });

  it('compares page basenames without extension', () => {
    expect(wikiPageBasename('folder/My Page.md')).toBe('My Page');
  });
});
