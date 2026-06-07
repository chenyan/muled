import {
  buildWikiVideoEmbedHtml,
  parseWikiVideoEmbedHtml,
} from '../renderer/lib/wikiVideoEmbed';

describe('wikiVideoEmbed', () => {
  it('round-trips wiki video html embed', () => {
    const path = 'physics/电磁学/att/demo.mp4';
    const html = buildWikiVideoEmbedHtml(path, 'wiki');
    expect(parseWikiVideoEmbedHtml(html)).toEqual({ kind: 'wiki', path });
  });

  it('round-trips file video html embed', () => {
    const path = 'media/demo.webm';
    const html = buildWikiVideoEmbedHtml(path, 'file');
    expect(parseWikiVideoEmbedHtml(html)).toEqual({ kind: 'file', path });
  });
});
