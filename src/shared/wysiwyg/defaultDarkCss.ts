import {
  SOURCE_DARK_PALETTE as P,
  WYSIWYG_DARK_PALETTE_VERSION,
} from '../sourceDarkPalette';

/** 首次启动写入 ~/.config/muled/wysiwyg/dark.css 的默认内容 */
export default `
/* Muled WYSIWYG — dark theme (可编辑，配色对齐 cm6-theme-basic-dark) */

[data-muled-wysiwyg-theme='dark'] {
  --wysiwyg-palette: ${WYSIWYG_DARK_PALETTE_VERSION};
  --wysiwyg-bg: ${P.bg};
  --wysiwyg-fg: ${P.fg};
  --wysiwyg-heading: ${P.heading};
  --wysiwyg-muted: ${P.muted};
  --wysiwyg-border: ${P.border};
  --wysiwyg-surface: ${P.surface};
  --wysiwyg-code-bg: ${P.codeBg};
  --wysiwyg-link: ${P.link};
  --wysiwyg-accent: ${P.accent};
  --wysiwyg-selection: ${P.selection};
}

.MuledMDXEditor__errorFallback {
  margin: 1rem;
  padding: 0.75rem 1rem;
  border: 1px solid #7f1d1d;
  border-radius: 6px;
  background: #450a0a;
  color: #fecaca;
  font-size: 13px;
}

.MuledMDXEditor__errorFallback button {
  margin-top: 0.5rem;
  padding: 0.25rem 0.75rem;
  border: 1px solid #991b1b;
  border-radius: 4px;
  background: ${P.surface};
  color: inherit;
  cursor: pointer;
}

[data-muled-wysiwyg-theme='dark'] .MuledMDXEditorHost .mdxeditor.MuledMDXEditor {
  --basePageBg: var(--wysiwyg-bg);
  --baseBase: var(--wysiwyg-surface);
  --baseBgSubtle: var(--wysiwyg-surface);
  --baseBg: #35393d;
  --baseBgHover: #3a3e42;
  --baseBgActive: #404448;
  --baseLine: var(--wysiwyg-border);
  --baseBorder: #484c50;
  --baseBorderHover: #52565a;
  --baseSolid: ${P.muted};
  --baseSolidHover: #b0b0b0;
  --baseText: var(--wysiwyg-fg);
  --baseTextContrast: var(--wysiwyg-heading);

  --accentBase: #252a2e;
  --accentBgSubtle: #2a3238;
  --accentBg: #2d3842;
  --accentBgHover: #334452;
  --accentBgActive: #3a5060;
  --accentLine: #4a6880;
  --accentBorder: ${P.link};
  --accentBorderHover: ${P.accent};
  --accentSolid: var(--wysiwyg-accent);
  --accentSolidHover: #8ec4e0;
  --accentText: ${P.accent};
  --accentTextContrast: ${P.highlight};

  --admonitionNoteBg: ${P.surface};
  --admonitionNoteBorder: #484c50;
}

.MuledMDXEditorHost .mdxeditor.MuledMDXEditor {
  display: block;
  height: auto;
  min-height: 100%;
  border: none;
  border-radius: 0;
  overflow: visible;
  background: var(--wysiwyg-bg, ${P.bg});
  color: var(--wysiwyg-fg, ${P.fg});
}

.MuledMDXEditorHost .mdxeditor-root-contenteditable {
  overflow: visible;
}

.MuledMDXEditorHost .mdxeditor.MuledMDXEditor,
.MuledMDXEditorHost .mdxeditor-root-contenteditable,
.MuledMDXEditorHost .mdxeditor-root-contenteditable [contenteditable='true'] {
  font-family: var(
    --muled-wysiwyg-font-family,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    Helvetica,
    Arial,
    sans-serif
  );
  font-size: var(--muled-wysiwyg-font-size, 15px);
  line-height: 1.6;
}

[data-muled-wysiwyg-theme='dark']
  .MuledMDXEditorHost
  .mdxeditor-root-contenteditable
  [contenteditable='true']::selection,
[data-muled-wysiwyg-theme='dark']
  .MuledMDXEditorHost
  .mdxeditor-root-contenteditable
  [contenteditable='true']
  *::selection {
  background: var(--wysiwyg-selection);
}

.MuledMDXEditorHost .mdxeditor-root-contenteditable [contenteditable='true'] {
  min-height: 2rem;
}

.MuledMDXEditorHost .mdxeditor h1,
.MuledMDXEditorHost .mdxeditor h2,
.MuledMDXEditorHost .mdxeditor h3,
.MuledMDXEditorHost .mdxeditor h4,
.MuledMDXEditorHost .mdxeditor h5,
.MuledMDXEditorHost .mdxeditor h6 {
  color: var(--wysiwyg-heading, ${P.heading});
}

.MuledMDXEditorHost .mdxeditor a {
  color: var(--wysiwyg-link, ${P.link});
}

.MuledMDXEditorHost .mdxeditor a:hover {
  color: ${P.accent};
}

.MuledMDXEditorHost .mdxeditor blockquote {
  border-left: 3px solid var(--wysiwyg-border, ${P.border});
  color: var(--wysiwyg-muted, ${P.muted});
}

.MuledMDXEditorHost .mdxeditor hr {
  border: none;
  border-top: 1px solid var(--wysiwyg-border, ${P.border});
}

.MuledMDXEditorHost .mdxeditor [data-editor-block-type='image'] img {
  max-width: 80%;
  height: auto;
  border-radius: 4px;
}

[data-muled-wysiwyg-theme='dark'] .MuledMDXEditorHost .mdxeditor mjx-container {
  color: var(--wysiwyg-fg, ${P.fg});
}

.MuledCodeBlockWithPreview {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--wysiwyg-border, ${P.border});
  border-radius: 6px;
  overflow: hidden;
  margin: 8px 0;
  background: var(--wysiwyg-surface, ${P.surface});
}

.MuledCodeBlockWithPreview__editor {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.MuledCodeBlockWithPreview__label {
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--wysiwyg-muted, ${P.muted});
  background: var(--wysiwyg-bg, ${P.bg});
  border-bottom: 1px solid var(--wysiwyg-border, ${P.border});
}

.MuledCodeBlockWithPreview__textarea {
  width: 100%;
  min-height: 96px;
  padding: 10px 12px;
  border: none;
  resize: none;
  overflow: hidden;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  line-height: 1.5;
  outline: none;
  box-sizing: border-box;
  background: var(--wysiwyg-code-bg, ${P.codeBg});
  color: var(--wysiwyg-fg, ${P.fg});
}

.MuledCodeBlockWithPreview__preview {
  border-top: 1px solid var(--wysiwyg-border, ${P.border});
  padding: 12px 16px;
  overflow: visible;
  background: var(--wysiwyg-code-bg, ${P.codeBg});
}

[data-muled-wysiwyg-theme='dark']
  .MuledCodeBlockWithPreview__preview--mermaidOnly
  svg {
  color-scheme: dark;
}

[data-muled-wysiwyg-theme='dark']
  .MuledCodeBlockWithPreview__preview--mermaidOnly
  .MuledCodeBlockWithPreview__error {
  border-radius: 6px;
}

.MuledCodeBlockWithPreview--mermaidOnly {
  border: none;
  background: transparent;
}

.MuledCodeBlockWithPreview__preview--mermaidOnly {
  border-top: none;
  padding: 8px 0;
  background: transparent;
  outline: none;
}

.MuledCodeBlockWithPreview__preview--mermaidOnly:focus-visible {
  outline: 2px solid ${P.muted};
  outline-offset: 2px;
  border-radius: 4px;
}

.MuledCodeBlockWithPreview--mathOnly {
  border: none;
  background: transparent;
}

.MuledCodeBlockWithPreview__preview--mathOnly {
  border-top: none;
  padding: 8px 0;
  background: transparent;
  outline: none;
  text-align: center;
}

.MuledCodeBlockWithPreview__preview--mathOnly:focus-visible {
  outline: 2px solid ${P.muted};
  outline-offset: 2px;
  border-radius: 4px;
}

.MuledCodeBlockWithPreview__preview--mathOnly mjx-container[display='true'] {
  margin: 0.5em 0;
}

.MuledInlineMath {
  display: inline-block;
  vertical-align: middle;
  margin: 0 0.1em;
  max-width: 100%;
}

.MuledInlineMath mjx-container {
  font-size: 1em;
  color: inherit;
}

.MuledInlineMath--error {
  color: #fca5a5;
}

.MuledInlineMath--empty {
  display: inline-block;
  min-width: 0.5em;
}

.MuledHtmlBlock {
  display: block;
  margin: 0.75em 0;
  max-width: 100%;
}

.MuledInlineHtml {
  display: inline;
}

.MuledCodeBlockWithPreview__preview svg {
  max-width: 100%;
  height: auto;
}

.MuledCodeBlockWithPreview__error {
  margin: 0;
  padding: 10px 12px;
  font-size: 12px;
  color: #fca5a5;
  background: #450a0a;
  border-top: 1px solid #7f1d1d;
}

.MuledCodeBlockWithPreview__empty {
  margin: 0;
  font-size: 12px;
  color: var(--wysiwyg-muted, ${P.muted});
}

.MuledPlainCodeBlock {
  position: relative;
  margin: 8px 0;
  border: 1px solid var(--wysiwyg-border, ${P.border});
  border-radius: 6px;
  overflow: hidden;
  background: var(--wysiwyg-code-bg, ${P.codeBg});
}

.MuledPlainCodeBlock__label {
  position: absolute;
  top: 6px;
  right: 8px;
  z-index: 1;
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--wysiwyg-muted, ${P.muted});
  background: color-mix(in srgb, var(--wysiwyg-bg, ${P.bg}) 88%, transparent);
  border: 1px solid var(--wysiwyg-border, ${P.border});
  border-radius: 4px;
  pointer-events: none;
  user-select: none;
}

.MuledPlainCodeBlock__cm {
  min-height: 96px;
}

.MuledPlainCodeBlock__cm .cm-editor {
  height: auto;
  background: transparent;
}

.MuledPlainCodeBlock__cm .cm-scroller {
  overflow: visible;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  line-height: 1.5;
}

.MuledPlainCodeBlock__cm .cm-gutters {
  display: none;
}

.MuledPlainCodeBlock__cm .cm-content {
  padding: 10px 12px;
  min-height: 96px;
}

.MuledCodeBlockWithPreview__placeholder {
  margin: 0;
  padding: 12px;
  font-size: 12px;
  color: #a1a1aa;
}
`.trim();
