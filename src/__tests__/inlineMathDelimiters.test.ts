import fs from 'fs';
import path from 'path';
import { canParseMarkdownBlock } from '../renderer/lib/markdownBlockParser';
import {
  replaceInlineMathDelimiters,
  scanInlineMathSegments,
  splitTextWithInlineMath,
} from '../renderer/lib/inlineMathDelimiters';
import { prepareMarkdownForWysiwyg } from '../renderer/lib/prepareMarkdownForWysiwyg';
import { normalizeMarkdownBlockMathAndHtml } from '../renderer/lib/wysiwygBlockNormalize';
import { splitTopLevelMarkdownBlocks } from '../renderer/lib/splitMarkdownBlocks';

describe('inlineMathDelimiters', () => {
  it('keeps orphan $ on the same line as plain text', () => {
    expect(replaceInlineMathDelimiters('price is $10 each')).toBe(
      'price is $10 each',
    );
  });

  it('does not pair $ across lines', () => {
    expect(replaceInlineMathDelimiters('$E=mc^2\nsecond $')).toBe(
      '$E=mc^2\nsecond $',
    );
    expect(replaceInlineMathDelimiters('line1 $E=mc^2\nline2 $x$ end')).toBe(
      'line1 $E=mc^2\nline2 <span data-muled-math="x"></span> end',
    );
  });

  it('pairs $...$ on the same line', () => {
    expect(scanInlineMathSegments('Energy $E=mc^2$ here')).toEqual([
      { type: 'text', value: 'Energy ' },
      { type: 'math', value: 'E=mc^2' },
      { type: 'text', value: ' here' },
    ]);
  });

  it('leaves $$ untouched for display math handling', () => {
    expect(replaceInlineMathDelimiters('before $$x$$ after')).toBe(
      'before $$x$$ after',
    );
  });

  it('does not convert $ inside inline code spans', () => {
    const line =
      "**Trading platforms (Robinhood)** treat each withdrawal as an isolated actor, which has a function to update an account. Say you have $10 in your account. If you and your wife both try to buy $10 of $GME simultaneously, your app will process the request that arrives first. When the second gets out of the queue, it’ll run the `checkBalance` statement, see that it’s now $0, and deny it.";
    const normalized = normalizeMarkdownBlockMathAndHtml(line);
    expect(normalized).not.toContain('&lt;span');
    expect(canParseMarkdownBlock(normalized)).toBe(true);
  });
});

describe('inlineMathDelimiters Discord note regression', () => {
  const notePath = path.join(
    '/Users/cy/obnotes/cs/infra',
    'Discord A Case Study in Performance Optimization.md',
  );

  it('prepares the full note for WYSIWYG without MDX parse failures', () => {
    if (!fs.existsSync(notePath)) {
      return;
    }
    const raw = fs.readFileSync(notePath, 'utf8');
    const prepared = prepareMarkdownForWysiwyg(raw);
    expect(prepared).not.toContain('&lt;span');
    expect(canParseMarkdownBlock(prepared)).toBe(true);

    const blocks = splitTopLevelMarkdownBlocks(prepared);
    const failed = blocks.filter((block) => !canParseMarkdownBlock(block));
    expect(failed).toEqual([]);
  });
});
