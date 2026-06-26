import type { ResolvedTheme } from '../../shared/types/theme';

/** 从宿主 document 读取、注入 Org 预览 iframe 的 UI 变量 */
export const ORG_PREVIEW_THEME_VAR_NAMES = [
  '--muled-bg',
  '--muled-fg',
  '--muled-muted-fg',
  '--muled-border',
  '--muled-surface-muted',
  '--muled-accent',
] as const;

export type OrgPreviewThemeVarName = (typeof ORG_PREVIEW_THEME_VAR_NAMES)[number];
export type OrgPreviewThemeVars = Record<OrgPreviewThemeVarName, string>;

const ORG_PREVIEW_THEME_FALLBACKS: Record<ResolvedTheme, OrgPreviewThemeVars> = {
  light: {
    '--muled-bg': '#fafafa',
    '--muled-fg': '#18181b',
    '--muled-muted-fg': '#71717a',
    '--muled-border': '#e4e4e7',
    '--muled-surface-muted': '#f4f4f5',
    '--muled-accent': '#3b82f6',
  },
  dark: {
    '--muled-bg': '#09090b',
    '--muled-fg': '#fafafa',
    '--muled-muted-fg': '#a1a1aa',
    '--muled-border': '#3f3f46',
    '--muled-surface-muted': '#27272a',
    '--muled-accent': '#60a5fa',
  },
  acme: {
    '--muled-bg': '#FFFFEA',
    '--muled-fg': '#000000',
    '--muled-muted-fg': '#333333',
    '--muled-border': '#000000',
    '--muled-surface-muted': '#EAFFFF',
    '--muled-accent': '#336699',
  },
};

export function readOrgPreviewThemeVars(
  root: HTMLElement | null = typeof document !== 'undefined'
    ? document.documentElement
    : null,
): OrgPreviewThemeVars {
  const fallback =
    ORG_PREVIEW_THEME_FALLBACKS[
      (root?.dataset.muledUiTheme as ResolvedTheme | undefined) ?? 'light'
    ] ?? ORG_PREVIEW_THEME_FALLBACKS.light;

  if (!root || typeof getComputedStyle === 'undefined') {
    return { ...fallback };
  }

  const computed = getComputedStyle(root);
  const vars = { ...fallback };
  for (const name of ORG_PREVIEW_THEME_VAR_NAMES) {
    const value = computed.getPropertyValue(name).trim();
    if (value) {
      vars[name] = value;
    }
  }
  return vars;
}

function buildOrgPreviewRootVars(
  uiTheme: ResolvedTheme,
  themeVars: OrgPreviewThemeVars,
): string {
  const entries = ORG_PREVIEW_THEME_VAR_NAMES.map(
    (name) => `${name}: ${themeVars[name]};`,
  ).join('\n  ');
  const codeBg =
    uiTheme === 'acme'
      ? `color-mix(in srgb, ${themeVars['--muled-bg']} 38%, white)`
      : themeVars['--muled-surface-muted'];
  return `:root {
  color-scheme: ${uiTheme === 'dark' ? 'dark' : 'light'};
  ${entries}
  --org-code-bg: ${codeBg};
  --org-pre-bg: ${codeBg};
}`;
}

function buildOrgPreviewPrismStyles(uiTheme: ResolvedTheme): string {
  if (uiTheme === 'dark') {
    return `
.token.comment,.token.prolog,.token.doctype,.token.cdata{color:#8b949e}
.token.punctuation{color:var(--muled-muted-fg)}
.token.property,.token.tag,.token.boolean,.token.number,.token.constant,.token.symbol,.token.deleted{color:#f69d50}
.token.selector,.token.attr-name,.token.string,.token.char,.token.builtin,.token.inserted{color:#7ee787}
.token.operator,.token.entity,.token.url,.language-css .token.string,.style .token.string{color:#ffa657}
.token.atrule,.token.attr-value,.token.keyword{color:#79c0ff}
.token.function,.token.class-name{color:#d2a8ff}
.token.regex,.token.important,.token.variable{color:#ffa657}`;
  }

  return `
.token.comment,.token.prolog,.token.doctype,.token.cdata{color:#708090}
.token.punctuation{color:var(--muled-muted-fg)}
.token.property,.token.tag,.token.boolean,.token.number,.token.constant,.token.symbol,.token.deleted{color:#905}
.token.selector,.token.attr-name,.token.string,.token.char,.token.builtin,.token.inserted{color:#690}
.token.operator,.token.entity,.token.url,.language-css .token.string,.style .token.string{color:#9a6e3a}
.token.atrule,.token.attr-value,.token.keyword{color:#07a}
.token.function,.token.class-name{color:#dd4a68}
.token.regex,.token.important,.token.variable{color:#e90}`;
}

export function buildOrgPreviewStyles(
  uiTheme: ResolvedTheme,
  themeVars: OrgPreviewThemeVars,
): string {
  const radius = uiTheme === 'acme' ? '0' : '6px';
  const inlineCodeRadius = uiTheme === 'acme' ? '0' : '4px';

  return `<style>
${buildOrgPreviewRootVars(uiTheme, themeVars)}
body {
  margin: 0;
  padding: 1.25rem 1.5rem 2rem;
  font: 15px/1.6 ui-sans-serif, system-ui, sans-serif;
  color: var(--muled-fg);
  background: var(--muled-bg);
  word-wrap: break-word;
}
h1, h2, h3, h4, h5, h6 {
  line-height: 1.25;
  margin: 1.5em 0 0.5em;
  font-weight: 600;
  color: var(--muled-fg);
}
h1 { font-size: 1.75rem; border-bottom: 1px solid var(--muled-border); padding-bottom: 0.25em; }
h2 { font-size: 1.4rem; }
h3 { font-size: 1.2rem; }
p { margin: 0.75em 0; }
ul, ol { margin: 0.75em 0; padding-left: 1.5em; }
li { margin: 0.25em 0; }
blockquote {
  margin: 1em 0;
  padding: 0.25em 1em;
  border-left: 3px solid var(--muled-border);
  color: var(--muled-muted-fg);
}
pre {
  overflow: auto;
  padding: 0.75em 1em;
  border-radius: ${radius};
  background: var(--org-pre-bg);
  border: 1px solid var(--muled-border);
  margin: 0.75em 0;
}
code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.9em;
}
:not(pre) > code {
  padding: 0.15em 0.35em;
  border-radius: ${inlineCodeRadius};
  background: var(--org-code-bg);
  color: var(--muled-fg);
}
table {
  border-collapse: collapse;
  margin: 1em 0;
  width: 100%;
}
th, td {
  border: 1px solid var(--muled-border);
  padding: 0.35em 0.6em;
  text-align: left;
}
a { color: var(--muled-accent); }
${buildOrgPreviewPrismStyles(uiTheme)}
</style>`;
}
