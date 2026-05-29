import normalizeMarkdownMath from '../renderer/lib/normalizeMarkdownMath';
import { normalizeMathSource } from '../renderer/lib/normalizeMathSource';
import renderMathBlock, { renderMathInline } from '../renderer/lib/renderMath';

describe('normalizeMathSource', () => {
  it('strips $$ delimiters', () => {
    expect(normalizeMathSource('$$\nE=mc^2\n$$')).toBe('E=mc^2');
  });
});

describe('renderMathBlock', () => {
  it('renders valid LaTeX', () => {
    const { html, error } = renderMathBlock('E = mc^2');
    expect(error).toBeNull();
    expect(html).toContain('katex');
  });

  it('returns empty for blank input', () => {
    expect(renderMathBlock('   ')).toEqual({ html: '', error: null });
  });

  it('strips $$ before rendering invalid LaTeX in red', () => {
    const { error, html } = renderMathBlock('$$\\broken$$');
    expect(error).toBeNull();
    expect(html).toContain('katex');
    expect(html).toContain('#dc2626');
  });
});

describe('renderMathInline', () => {
  it('renders inline LaTeX', () => {
    const { html, error } = renderMathInline('E=mc^2');
    expect(error).toBeNull();
    expect(html).toContain('katex');
  });
});

describe('normalizeMarkdownMath', () => {
  it('converts $$ display math to math fence', () => {
    const result = normalizeMarkdownMath('$$\nE=mc^2\n$$');
    expect(result).toContain('```math');
    expect(result).toContain('E=mc^2');
  });

  it('converts inline $...$ to span', () => {
    const result = normalizeMarkdownMath('Energy $E=mc^2$ here');
    expect(result).toContain('data-muled-math="E=mc^2"');
  });

  it('normalizes latex fence to math', () => {
    const result = normalizeMarkdownMath('```latex\nx\n```');
    expect(result).toContain('```math');
  });
});
