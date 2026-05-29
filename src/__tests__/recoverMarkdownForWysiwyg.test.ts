import {
  recoverMarkdownForWysiwyg,
  wrapAsTxtCodeBlock,
} from '../renderer/lib/recoverMarkdownForWysiwyg';
import { splitTopLevelMarkdownBlocks } from '../renderer/lib/splitMarkdownBlocks';

describe('splitTopLevelMarkdownBlocks', () => {
  it('splits paragraphs on blank lines', () => {
    expect(splitTopLevelMarkdownBlocks('# a\n\n# b')).toEqual(['# a', '# b']);
  });

  it('keeps fenced code blocks intact', () => {
    const source = 'intro\n\n```js\nline1\n\nline2\n```\n\noutro';
    expect(splitTopLevelMarkdownBlocks(source)).toEqual([
      'intro',
      '```js\nline1\n\nline2\n```',
      'outro',
    ]);
  });
});

describe('recoverMarkdownForWysiwyg', () => {
  it('wraps only blocks that fail the parser check', () => {
    const source = '# ok\n\nBAD\n\n## also ok';
    const canParse = (block: string) => block.trim() !== 'BAD';
    const recovered = recoverMarkdownForWysiwyg(source, 1, canParse);
    expect(recovered).toContain('# ok');
    expect(recovered).toContain('## also ok');
    expect(recovered).toContain(wrapAsTxtCodeBlock('BAD'));
  });

  it('wraps the entire document on second attempt', () => {
    const source = 'broken doc';
    expect(recoverMarkdownForWysiwyg(source, 2, () => false)).toBe(
      wrapAsTxtCodeBlock(source),
    );
  });
});

describe('wrapAsTxtCodeBlock', () => {
  it('uses a longer fence when content contains backticks', () => {
    expect(wrapAsTxtCodeBlock('```')).toBe('````txt\n```\n````');
  });
});
