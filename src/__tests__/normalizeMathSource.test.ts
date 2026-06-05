import normalizeMarkdownHtmlTags from '../renderer/lib/normalizeMarkdownHtmlTags';
import normalizeMarkdownMath from '../renderer/lib/normalizeMarkdownMath';
import { unescapeHtmlAttr } from '../renderer/lib/denormalizeMarkdownMath';
import { normalizeMathSource } from '../renderer/lib/normalizeMathSource';
import renderMathBlock, {
  isMathJaxErrorHtml,
  renderMathInline,
} from '../renderer/lib/renderMath';

function prepareForWysiwyg(source: string): string {
  return normalizeMarkdownHtmlTags(normalizeMarkdownMath(source));
}

describe('normalizeMathSource', () => {
  it('strips $$ delimiters', () => {
    expect(normalizeMathSource('$$\nE=mc^2\n$$')).toBe('E=mc^2');
  });

  it('strips invisible Unicode characters from pasted math', () => {
    // U+2062 INVISIBLE TIMES — common in Word/PDF copy-paste
    expect(normalizeMathSource('E\u2062=mc\u2062^2')).toBe('E=mc^2');
  });
});

describe('renderMathBlock', () => {
  it('renders valid LaTeX', () => {
    const { html, error } = renderMathBlock('E = mc^2');
    expect(error).toBeNull();
    expect(html).toContain('mjx-container');
  });

  it('returns empty for blank input', () => {
    expect(renderMathBlock('   ')).toEqual({ html: '', error: null });
  });

  it('strips $$ before rendering invalid LaTeX in red', () => {
    const { error, html } = renderMathBlock('$$\\broken$$');
    expect(error).toBeNull();
    expect(html).toContain('mjx-container');
    expect(html).toContain('fill="red"');
  });
});

describe('renderMathInline', () => {
  it('renders inline LaTeX', () => {
    const { html, error } = renderMathInline('E=mc^2');
    expect(error).toBeNull();
    expect(html).toContain('mjx-container');
    expect(isMathJaxErrorHtml(html)).toBe(false);
  });

  it('marks MathJax soft errors in html', () => {
    const { html, error } = renderMathInline(String.raw`\broken`);
    expect(error).toBeNull();
    expect(isMathJaxErrorHtml(html)).toBe(true);
  });
});

describe('normalizeMarkdownMath', () => {
  it('converts $$ display math to math fence', () => {
    const result = normalizeMarkdownMath('$$\nE=mc^2\n$$');
    expect(result).toContain('```math');
    expect(result).toContain('E=mc^2');
  });

  it('converts $$ when opening delimiter shares a line with content', () => {
    const result = normalizeMarkdownMath(
      '$$E=mc^2\n$$',
    );
    expect(result).toBe('```math\nE=mc^2\n```');
  });

  it('converts multiline $$ content with internal newlines', () => {
    const result = normalizeMarkdownMath(
      '$$E=mc^2\n+\nF=ma\n$$',
    );
    expect(result).toBe('```math\nE=mc^2\n+\nF=ma\n```');
  });

  it('converts inline $...$ to span', () => {
    const result = normalizeMarkdownMath('Energy $E=mc^2$ here');
    expect(result).toContain('data-muled-math="E=mc^2"');
  });

  it('prepares comparison inside inline math for MathJax without double-encoding', () => {
    const line = String.raw`拿到 $Max(v \mid v<=ReadTs)$ 的值`;
    const prepared = prepareForWysiwyg(line);
    expect(prepared).toContain('data-muled-math=');
    expect(prepared).not.toContain('&amp;lt;');

    const match = prepared.match(/data-muled-math="([^"]*)"/);
    expect(match).toBeTruthy();
    const latex = unescapeHtmlAttr(match![1]);
    expect(latex).toBe(String.raw`Max(v \mid v<=ReadTs)`);

    const { html, error } = renderMathInline(latex);
    expect(error).toBeNull();
    expect(html).toContain('mjx-container');
    expect(html).not.toContain('Misplaced');
  });

  it('normalizes latex fence to math', () => {
    const result = normalizeMarkdownMath('```latex\nx\n```');
    expect(result).toContain('```latex');
    expect(result).not.toContain('```math');
  });
});
