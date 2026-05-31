import fs from 'fs';
import path from 'path';
import { canParseMarkdownBlock } from '../renderer/lib/markdownBlockParser';
import { denormalizeMarkdownHtmlTags } from '../renderer/lib/denormalizeMarkdownHtmlTags';
import normalizeMarkdownHtmlTags, {
  parseHtmlLikeTagName,
} from '../renderer/lib/normalizeMarkdownHtmlTags';
import { exportMarkdownFromWysiwyg } from '../renderer/lib/normalizeMarkdownWikiImages';

describe('parseHtmlLikeTagName', () => {
  it('recognizes common tags', () => {
    expect(parseHtmlLikeTagName('<br>')).toBe('br');
    expect(parseHtmlLikeTagName('<br/>')).toBe('br');
    expect(parseHtmlLikeTagName('</div>')).toBe('div');
    expect(parseHtmlLikeTagName('<span data-x="1">')).toBe('span');
  });

  it('returns null for book-title-like fragments', () => {
    expect(parseHtmlLikeTagName('<中国震撼世界>')).toBeNull();
    expect(parseHtmlLikeTagName('<[[wiki]]>')).toBeNull();
  });
});

describe('normalizeMarkdownHtmlTags', () => {
  it('escapes Obsidian-style book titles', () => {
    const source = '在路上听<中国震撼世界>,发现';
    expect(normalizeMarkdownHtmlTags(source)).toBe(
      '在路上听&lt;中国震撼世界&gt;,发现',
    );
  });

  it('keeps common html tags', () => {
    const source = 'line<br>break and <strong>bold</strong>';
    expect(normalizeMarkdownHtmlTags(source)).toBe(source);
  });

  it('escapes mixed wiki book title syntax', () => {
    const source = '<[[减租和生产是保卫解放区的两件大事]]>';
    expect(normalizeMarkdownHtmlTags(source)).toBe(
      '&lt;[[减租和生产是保卫解放区的两件大事]]&gt;',
    );
  });

  it('does not alter fenced code blocks', () => {
    const source = '```txt\n<custom>\n```';
    expect(normalizeMarkdownHtmlTags(source)).toBe(source);
  });

  it('does not alter inline code', () => {
    const source = 'use `<foo>` here';
    expect(normalizeMarkdownHtmlTags(source)).toBe(source);
  });

  it('round-trips through denormalize and export', () => {
    const original = '签订<中苏友好同盟条约>，见<br>注';
    const normalized = normalizeMarkdownHtmlTags(original);
    expect(denormalizeMarkdownHtmlTags(normalized)).toBe(original);
    expect(exportMarkdownFromWysiwyg(normalized, original)).toBe(original);
  });

  it('allows MDX parse of civil war note snippets after normalize', () => {
    const notePath = path.join(
      '/Users/cy/obnotes/notes',
      '2025-09-22_解放战争概略.md',
    );
    if (!fs.existsSync(notePath)) {
      return;
    }
    const source = fs.readFileSync(notePath, 'utf8');
    const normalized = normalizeMarkdownHtmlTags(source);
    expect(canParseMarkdownBlock(normalized)).toBe(true);
  });
});
