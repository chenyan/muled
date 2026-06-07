import { mapOutsideInlineCode } from '../renderer/lib/mapOutsideInlineCode';
import { normalizeMarkdownWikiImages } from '../renderer/lib/normalizeMarkdownWikiImages';
import { normalizeMarkdownWikiLinks } from '../renderer/lib/normalizeMarkdownWikiLinks';
import { buildWikiVideoEmbedHtml } from '../renderer/lib/wikiVideoEmbed';

describe('mapOutsideInlineCode', () => {
  it('skips transforms inside inline code', () => {
    const input = 'use `![[demo.mp4]]` syntax';
    const result = mapOutsideInlineCode(input, (segment) =>
      segment.replace('![[demo.mp4]]', 'CHANGED'),
    );
    expect(result).toBe('use `![[demo.mp4]]` syntax');
  });
});

describe('normalizeMarkdownWikiImages inline code', () => {
  it('does not embed video syntax inside backticks', () => {
    const source = 'literal `![[clips/demo.mp4]]` here';
    expect(normalizeMarkdownWikiImages(source)).toBe(source);
  });

  it('still embeds video syntax outside backticks', () => {
    const source = 'see `code` and ![[clips/demo.mp4]]';
    const normalized = normalizeMarkdownWikiImages(source);
    expect(normalized).toContain('`code`');
    expect(normalized).toContain(buildWikiVideoEmbedHtml('clips/demo.mp4', 'wiki'));
    expect(normalized).not.toContain('`![[');
  });

  it('does not normalize wiki image syntax inside backticks', () => {
    const source = 'ref `![[foo.png]]`';
    expect(normalizeMarkdownWikiImages(source)).toBe(source);
  });

  it('does not normalize markdown image syntax inside backticks', () => {
    const source = 'ref `![](att/foo.png)`';
    expect(normalizeMarkdownWikiImages(source)).toBe(source);
  });
});

describe('normalizeMarkdownWikiLinks inline code', () => {
  it('does not normalize wiki links inside backticks', () => {
    const source = 'type `[[Other Note]]` literally';
    expect(normalizeMarkdownWikiLinks(source)).toBe(source);
  });

  it('still normalizes wiki links outside backticks', () => {
    const source = 'go to [[Other Note]] or `[[Code]]`';
    const normalized = normalizeMarkdownWikiLinks(source);
    expect(normalized).toContain('`[[Code]]`');
    expect(normalized).toContain('#muled-wiki:');
    expect(normalized).not.toContain('`(#muled-wiki:');
  });
});
