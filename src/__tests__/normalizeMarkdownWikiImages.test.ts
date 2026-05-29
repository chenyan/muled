import {
  exportMarkdownFromWysiwyg,
  exportWikiImagesFromMarkdown,
  exportWikiImageEmbedMarkdown,
  normalizeMarkdownWikiImages,
  MULED_FILE_SRC_PREFIX,
  WIKI_IMAGE_SRC_PREFIX,
} from '../renderer/lib/normalizeMarkdownWikiImages';
import {
  resolveWikiImagePathCandidates,
} from '../renderer/lib/resolveWikiImagePreview';

describe('normalizeMarkdownWikiImages', () => {
  it('converts wiki embed syntax to internal markdown image', () => {
    const source = '![[cs/llm/att/foo.png]]';
    expect(normalizeMarkdownWikiImages(source)).toBe(
      `![](${WIKI_IMAGE_SRC_PREFIX}cs/llm/att/foo.png)`,
    );
  });

  it('keeps pipe suffix as alt text on export', () => {
    const normalized = normalizeMarkdownWikiImages('![[foo.png|caption]]');
    expect(normalized).toBe(`![caption](${WIKI_IMAGE_SRC_PREFIX}foo.png)`);
    expect(exportWikiImagesFromMarkdown(normalized)).toBe('![[foo.png|caption]]');
  });

  it('exports internal wiki image urls back to wiki embed syntax', () => {
    const markdown = `![](${WIKI_IMAGE_SRC_PREFIX}cs/llm/att/foo.png)`;
    expect(exportWikiImagesFromMarkdown(markdown)).toBe('![[cs/llm/att/foo.png]]');
  });

  it('exportMarkdownFromWysiwyg strips leaked muled-wiki from stored text', () => {
    const stored = `before ![](${WIKI_IMAGE_SRC_PREFIX}a.png) after`;
    expect(exportMarkdownFromWysiwyg(stored)).toBe('before ![[a.png]] after');
  });

  it('normalizes workspace markdown images for WYSIWYG preview', () => {
    const source = '![](cs/llm/att/foo.png)';
    expect(normalizeMarkdownWikiImages(source)).toBe(
      `![](${MULED_FILE_SRC_PREFIX}cs/llm/att/foo.png)`,
    );
  });

  it('exports muled-file images back to standard markdown', () => {
    const markdown = `![](${MULED_FILE_SRC_PREFIX}cs/llm/att/foo.png)`;
    expect(exportWikiImagesFromMarkdown(markdown)).toBe('![](cs/llm/att/foo.png)');
  });

  it('leaves http image urls unchanged on normalize', () => {
    const url = 'https://example.com/a.png';
    expect(normalizeMarkdownWikiImages(`![](${url})`)).toBe(`![](${url})`);
  });
});

describe('exportWikiImageEmbedMarkdown', () => {
  it('formats alt pipe suffix', () => {
    expect(exportWikiImageEmbedMarkdown('x.png', 'cap')).toBe('![[x.png|cap]]');
  });
});

describe('resolveWikiImagePathCandidates', () => {
  it('tries workspace-relative and document-relative paths', () => {
    expect(
      resolveWikiImagePathCandidates('att/foo.png', 'notes/readme.md'),
    ).toEqual(['att/foo.png', 'notes/att/foo.png']);
  });
});
