import { highlightHtmlCodeBlocks } from '../renderer/lib/notebookHighlighter';
import { buildOrgPreviewStyles } from '../renderer/lib/orgPreviewTheme';

describe('org preview theme', () => {
  it('embeds ui theme variables in generated styles', () => {
    const styles = buildOrgPreviewStyles('dark', {
      '--muled-bg': '#09090b',
      '--muled-fg': '#fafafa',
      '--muled-muted-fg': '#a1a1aa',
      '--muled-border': '#3f3f46',
      '--muled-surface-muted': '#27272a',
      '--muled-accent': '#60a5fa',
    });

    expect(styles).toContain('--muled-bg: #09090b');
    expect(styles).toContain('color: var(--muled-fg)');
    expect(styles).toContain('color: var(--muled-accent)');
    expect(styles).toContain('color-scheme: dark');
    expect(styles).toContain('color:#79c0ff');
  });

  it('uses acme code block background mix and square corners', () => {
    const styles = buildOrgPreviewStyles('acme', {
      '--muled-bg': '#FFFFEA',
      '--muled-fg': '#000000',
      '--muled-muted-fg': '#333333',
      '--muled-border': '#000000',
      '--muled-surface-muted': '#EAFFFF',
      '--muled-accent': '#336699',
    });

    expect(styles).toContain(
      '--org-code-bg: color-mix(in srgb, #FFFFEA 38%, white)',
    );
    expect(styles).toContain('border-radius: 0');
  });
});

describe('org preview code highlighting', () => {
  it('highlights fenced code blocks with prism tokens', () => {
    const html = highlightHtmlCodeBlocks(
      '<pre class="src-block"><code class="language-python">print("hello")\n</code></pre>',
    );

    expect(html).toContain('language-python');
    expect(html).toContain('<span class="token');
    expect(html).toContain('print');
  });

  it('highlights scheme src blocks', () => {
    const html = highlightHtmlCodeBlocks(
      '<pre class="src-block"><code class="language-scheme">(define x 1)\n</code></pre>',
    );

    expect(html).toContain('language-scheme');
    expect(html).toContain('<span class="token');
    expect(html).toContain('define');
  });
});
