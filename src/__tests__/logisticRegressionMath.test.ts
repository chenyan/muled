import fs from 'fs';
import { unescapeHtmlAttr } from '../renderer/lib/denormalizeMarkdownMath';
import {
  replaceInlineMathDelimiters,
} from '../renderer/lib/inlineMathDelimiters';
import { prepareMarkdownForWysiwyg } from '../renderer/lib/prepareMarkdownForWysiwyg';
import { renderMathInline } from '../renderer/lib/renderMath';
import { isMuledMathSpan } from '../renderer/lib/serializeMdastNodeToHtml';

const notePath =
  '/Users/cy/obnotes/cs/ml&dl/Logistic Regression.md';

describe('Logistic Regression inline math', () => {
  it('converts formula to data-muled-math span', () => {
    const line = String.raw`- $f(x)=\dfrac{1}{1+e^{-x}}$`;
    const replaced = replaceInlineMathDelimiters(line);
    expect(replaced).toContain('data-muled-math=');
    expect(replaced).toContain(String.raw`f(x)=\dfrac{1}{1+e^{-x}}`);
  });

  it('renders dfrac with MathJax', () => {
    const latex = String.raw`f(x)=\dfrac{1}{1+e^{-x}}`;
    const { html, error } = renderMathInline(latex);
    expect(error).toBeNull();
    expect(html).toContain('mjx-container');
  });

  it('treats list-only math span as muled math mdast node (flow element)', () => {
    expect(
      isMuledMathSpan({
        type: 'mdxJsxFlowElement',
        name: 'span',
        attributes: [{ type: 'mdxJsxAttribute', name: 'data-muled-math' }],
      }),
    ).toBe(true);
  });

  it('prepares the full note for WYSIWYG', () => {
    if (!fs.existsSync(notePath)) {
      return;
    }
    const raw = fs.readFileSync(notePath, 'utf8');
    const prepared = prepareMarkdownForWysiwyg(raw);
    expect(prepared).toContain('data-muled-math=');
    expect(prepared).not.toContain('&lt;span');

    const match = prepared.match(/data-muled-math="([^"]*dfrac[^"]*)"/);
    expect(match).toBeTruthy();
    const latex = unescapeHtmlAttr(match![1]);
    expect(latex).toBe(String.raw`f(x)=\dfrac{1}{1+e^{-x}}`);
  });
});
