import {
  denormalizeInlineMathSpans,
  denormalizeMarkdownMath,
} from '../renderer/lib/denormalizeMarkdownMath';
import normalizeMarkdownMath from '../renderer/lib/normalizeMarkdownMath';
import { exportMarkdownFromWysiwyg } from '../renderer/lib/normalizeMarkdownWikiImages';

describe('denormalizeInlineMathSpans', () => {
  it('converts span bridge back to inline $...$', () => {
    const source = 'Energy <span data-muled-math="E=mc^2"></span> here';
    expect(denormalizeInlineMathSpans(source)).toBe('Energy $E=mc^2$ here');
  });

  it('unescapes HTML entities in the attribute', () => {
    const source = '<span data-muled-math="a&lt;b"></span>';
    expect(denormalizeInlineMathSpans(source)).toBe('$a<b$');
  });

  it('unescapes double-encoded entities from legacy prepare order', () => {
    const source = '<span data-muled-math="Max(v \\mid v&amp;lt;=ReadTs)"></span>';
    expect(denormalizeInlineMathSpans(source)).toBe(
      String.raw`$Max(v \mid v<=ReadTs)$`,
    );
  });

  it('supports single-quoted attributes', () => {
    const source = "<span data-muled-math='x^2'></span>";
    expect(denormalizeInlineMathSpans(source)).toBe('$x^2$');
  });
});

describe('denormalizeMarkdownMath', () => {
  it('converts ```math blocks back to $$ delimiters', () => {
    const source = '```math\nE=mc^2\n```';
    expect(denormalizeMarkdownMath(source)).toBe('$$E=mc^2$$');
  });

  it('uses multiline $$ when math content spans lines', () => {
    const source = '```math\nE=mc^2\n+\nF=ma\n```';
    expect(denormalizeMarkdownMath(source)).toBe('$$\nE=mc^2\n+\nF=ma\n$$');
  });

  it('keeps ```latex fences unchanged', () => {
    const source = '```latex\nx\n```';
    expect(denormalizeMarkdownMath(source)).toBe(source);
  });

  it('preserves native ```math when original file uses math fences only', () => {
    const original = '```math\nx\n```';
    const edited = '```math\nx + 1\n```';
    expect(denormalizeMarkdownMath(edited, original)).toBe(edited);
  });

  it('round-trips $$ through normalize and denormalize on export', () => {
    const original = '$$\nE=mc^2\n$$';
    const inEditor = normalizeMarkdownMath(original);
    expect(inEditor).toContain('```math');
    expect(exportMarkdownFromWysiwyg(inEditor, original)).toBe('$$E=mc^2$$');
  });

  it('round-trips $$ when closing delimiter is on its own line', () => {
    const original = '$$E=mc^2\n$$';
    const inEditor = normalizeMarkdownMath(original);
    expect(inEditor).toBe('```math\nE=mc^2\n```');
    expect(exportMarkdownFromWysiwyg(inEditor, original)).toBe('$$E=mc^2$$');
  });

  it('exportMarkdownFromWysiwyg strips leaked inline math spans', () => {
    const leaked = 'before <span data-muled-math="E=mc^2"></span> after';
    expect(exportMarkdownFromWysiwyg(leaked)).toBe('before $E=mc^2$ after');
  });

  it('round-trips inline $...$ through normalize and export', () => {
    const original = 'Energy $E=mc^2$ here';
    const inEditor = normalizeMarkdownMath(original);
    expect(inEditor).toContain('data-muled-math');
    expect(exportMarkdownFromWysiwyg(inEditor, original)).toBe(original);
  });
});
