import fs from 'fs';
import path from 'path';
import { canParseMarkdownBlock } from '../renderer/lib/markdownBlockParser';
import { denormalizeMarkdownHtmlTags } from '../renderer/lib/denormalizeMarkdownHtmlTags';
import normalizeMarkdownHtmlTags, {
  parseHtmlLikeTagName,
  shouldKeepHtmlTag,
} from '../renderer/lib/normalizeMarkdownHtmlTags';
import normalizeMarkdownMath from '../renderer/lib/normalizeMarkdownMath';
import { exportMarkdownFromWysiwyg } from '../renderer/lib/normalizeMarkdownWikiImages';

function prepareForWysiwyg(source: string): string {
  return normalizeMarkdownHtmlTags(normalizeMarkdownMath(source));
}

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

describe('shouldKeepHtmlTag', () => {
  it('keeps whitelist tags only', () => {
    expect(shouldKeepHtmlTag('<br>')).toBe(true);
    expect(shouldKeepHtmlTag('<ReadVer>')).toBe(false);
    expect(shouldKeepHtmlTag('<中国震撼世界>')).toBe(false);
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

  it('escapes comparison operators and unclosed angle brackets for MDX', () => {
    expect(normalizeMarkdownHtmlTags('版本号<ReadVer的写')).toBe(
      '版本号&lt;ReadVer的写',
    );
    expect(normalizeMarkdownHtmlTags('4<v<=10')).toBe('4&lt;v&lt;=10');
    expect(normalizeMarkdownHtmlTags('Vmax < v <= ReadTs')).toBe(
      'Vmax &lt; v &lt;= ReadTs',
    );
    expect(normalizeMarkdownHtmlTags('Max(v | v<=ReadTs)')).toBe(
      'Max(v | v&lt;=ReadTs)',
    );
  });

  it('round-trips comparison operator escapes', () => {
    const original =
      '拒绝版本号<ReadVer的写，以及 4<v<=10 与 Vmax < v <= ReadTs';
    const normalized = normalizeMarkdownHtmlTags(original);
    expect(denormalizeMarkdownHtmlTags(normalized)).toBe(original);
    expect(canParseMarkdownBlock(normalized)).toBe(true);
  });

  it('allows MDX parse of MVCC snapshot note snippets after prepare', () => {
    const snippets = [
      '要读到ReadVer的数据集并保存为快照。按照MVCC读取方式，需要从每个Key的多版本中选取版本号= Max(v | v<=ReadTs)的。',
      '|KeyB|2,4|4<v<=10|',
      '**R2:** Vmax >= ReadTs || (不可能出现版本v：Vmax < v <= ReadTs)',
      '拒绝还没到来的且版本号<ReadVer的写',
    ];
    for (const snippet of snippets) {
      expect(canParseMarkdownBlock(prepareForWysiwyg(snippet))).toBe(true);
    }
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
