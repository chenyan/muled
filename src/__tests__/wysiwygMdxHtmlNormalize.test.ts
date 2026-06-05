import * as fs from 'fs';
import { canParseMarkdownBlock } from '../renderer/lib/markdownBlockParser';
import { prepareMarkdownForWysiwyg } from '../renderer/lib/prepareMarkdownForWysiwyg';
import {
  normalizeHtmlForMdxJsx,
  normalizeMdxJsxHtmlTableAsterisks,
  normalizeVoidHtmlOpenTags,
} from '../renderer/lib/wysiwygBlockNormalize';

describe('normalizeHtmlForMdxJsx', () => {
  it('self-closes void hr tags', () => {
    expect(normalizeVoidHtmlOpenTags('<hr>Cohort Life Table')).toBe(
      '<hr />Cohort Life Table',
    );
  });

  it('escapes asterisks inside html tables for mdxMd', () => {
    const table =
      '<table><tr><td>0.830 <sup><a href="#x">***</a></sup></td></tr></table>';
    expect(normalizeMdxJsxHtmlTableAsterisks(table)).toBe(
      '<table><tr><td>0.830 <sup><a href="#x">&#42;&#42;&#42;</a></sup></td></tr></table>',
    );
  });

  it('allows MDXEditor-style parse of pmc-style table snippets', () => {
    const snippet = normalizeHtmlForMdxJsx(
      '<table><thead><tr><th colspan="2"><hr>Cohort</th></tr></thead><tbody><tr><td>p&lt;0.01 <sup><a href="#TFN3">***</a></sup></td></tr></tbody></table>',
    );
    expect(canParseMarkdownBlock(snippet)).toBe(true);
  });
});

describe('prepareMarkdownForWysiwyg PMC mortality note', () => {
  const notePath =
    "/Users/cy/obnotes/文史/现代/An exploration of China's mortality decline under Mao A provincial analysis, 1950–80.md";

  it('prepares the full note for MDXEditor import', () => {
    if (!fs.existsSync(notePath)) {
      return;
    }
    const prepared = prepareMarkdownForWysiwyg(fs.readFileSync(notePath, 'utf8'));
    expect(canParseMarkdownBlock(prepared)).toBe(true);
  });
});
