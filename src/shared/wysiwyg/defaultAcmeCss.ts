import { ACME_PALETTE as P } from '../acmePalette';

/** 首次启动写入 ~/.config/muled/wysiwyg/acme.css 的默认内容 */
export default `
/* Muled WYSIWYG — acme theme (可编辑，配色参考 Acme 编辑器) */

[data-muled-wysiwyg-theme='acme'] {
  --wysiwyg-palette: 5;
  --wysiwyg-bg: ${P.bg};
  --wysiwyg-fg: ${P.fg};
  --wysiwyg-heading: ${P.fg};
  --wysiwyg-muted: ${P.muted};
  --wysiwyg-border: ${P.border};
  --wysiwyg-surface: ${P.header};
  --wysiwyg-code-bg: ${P.codeBg};
  --wysiwyg-link: ${P.link};
  --wysiwyg-accent: ${P.accent};
  --wysiwyg-selection: ${P.selection};
}

.MuledMDXEditor__errorFallback {
  margin: 1rem;
  padding: 0.75rem 1rem;
  border: 1px solid ${P.border};
  border-radius: 0;
  background: ${P.bg};
  color: #cc0000;
  font-size: 13px;
}

.MuledMDXEditor__errorFallback button {
  margin-top: 0.5rem;
  padding: 0.25rem 0.75rem;
  border: 1px solid ${P.border};
  border-radius: 0;
  background: ${P.header};
  color: inherit;
  cursor: pointer;
}

[data-muled-wysiwyg-theme='acme'] .MuledMDXEditorHost .mdxeditor.MuledMDXEditor {
  --basePageBg: var(--wysiwyg-bg);
  --baseBase: var(--wysiwyg-surface);
  --baseBgSubtle: var(--wysiwyg-surface);
  --baseBg: ${P.header};
  --baseBgHover: ${P.highlight};
  --baseBgActive: ${P.selection};
  --baseLine: var(--wysiwyg-border);
  --baseBorder: ${P.border};
  --baseBorderHover: ${P.border};
  --baseSolid: ${P.muted};
  --baseSolidHover: ${P.fg};
  --baseText: var(--wysiwyg-fg);
  --baseTextContrast: var(--wysiwyg-heading);

  --accentBase: ${P.bg};
  --accentBgSubtle: ${P.header};
  --accentBg: ${P.highlight};
  --accentBgHover: ${P.selection};
  --accentBgActive: ${P.selection};
  --accentLine: ${P.border};
  --accentBorder: ${P.accent};
  --accentBorderHover: ${P.accent};
  --accentSolid: ${P.accent};
  --accentSolidHover: ${P.accent};
  --accentText: ${P.accent};
  --accentTextContrast: ${P.fg};

  --admonitionNoteBg: ${P.header};
  --admonitionNoteBorder: ${P.border};
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

[data-muled-wysiwyg-theme='acme']
  .MuledMDXEditorHost
  .mdxeditor-root-contenteditable
  [contenteditable='true']::selection,
[data-muled-wysiwyg-theme='acme']
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
  color: var(--wysiwyg-heading, ${P.fg});
  font-weight: bold;
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
  border: 1px solid ${P.border};
}

[data-muled-wysiwyg-theme='acme'] .MuledMDXEditorHost .mdxeditor mjx-container {
  color: var(--wysiwyg-fg, ${P.fg});
}

.MuledCodeBlockWithPreview {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--wysiwyg-border, ${P.border});
  border-radius: 0;
  overflow: hidden;
  margin: 8px 0;
  background: var(--wysiwyg-surface, ${P.header});
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
  color: var(--wysiwyg-fg, ${P.fg});
  background: var(--wysiwyg-surface, ${P.header});
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
  outline: 2px solid ${P.border};
  outline-offset: 2px;
  border-radius: 0;
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
  outline: 2px solid ${P.border};
  outline-offset: 2px;
  border-radius: 0;
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
  color: #cc0000;
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

.MuledFrontmatterTable {
  width: 100%;
  border-collapse: collapse;
  margin: 0;
  font-size: 0.92em;
}

.MuledFrontmatterTable td {
  border: 1px solid ${P.border};
  padding: 6px 10px;
  text-align: left;
  vertical-align: top;
}

.MuledFrontmatterTable td:first-child {
  width: 28%;
  color: var(--wysiwyg-muted, ${P.muted});
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
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
  color: #cc0000;
  background: ${P.bg};
  border-top: 1px solid ${P.border};
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
  border-radius: 0;
  overflow: hidden;
  background: var(--wysiwyg-code-bg, ${P.codeBg});
}

.MuledPlainCodeBlock__header {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 2px 6px;
  border-bottom: 1px solid var(--wysiwyg-border, ${P.border});
  background: color-mix(in srgb, var(--wysiwyg-surface, ${P.header}) 72%, transparent);
}

.MuledPlainCodeBlock__label {
  padding: 1px 5px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--wysiwyg-muted, ${P.muted});
  background: color-mix(in srgb, var(--wysiwyg-surface, ${P.header}) 88%, transparent);
  border: 1px solid var(--wysiwyg-border, ${P.border});
  border-radius: 0;
  min-width: 3ch;
  max-width: 16ch;
  cursor: text;
  outline: none;
  box-sizing: border-box;
}

.MuledPlainCodeBlock__label:focus {
  color: var(--wysiwyg-fg, ${P.fg});
  border-color: var(--wysiwyg-accent, ${P.accent});
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
  opacity: 0.72;
}

[data-muled-wysiwyg-theme='acme'] .MuledMDXEditorHost .mdxeditor code,
[data-muled-wysiwyg-theme='acme'] .MuledMDXEditorHost .mdxeditor pre {
  border: 1px solid ${P.border};
  border-radius: 0;
  background: ${P.codeBg};
}

[data-muled-wysiwyg-theme='acme'] .MuledMDXEditorHost .mdxeditor table {
  border-collapse: collapse;
  border: 1px solid ${P.border};
  border-radius: 0;
}

/* 覆盖 MDXEditor tableEditor：tbody 单元格边框用 --baseBgActive（#E8D882），特异性高于 .mdxeditor th/td */
[data-muled-wysiwyg-theme='acme']
  .MuledMDXEditorHost
  .mdxeditor
  table
  > tbody
  > tr
  > td:not([data-tool-cell='true']),
[data-muled-wysiwyg-theme='acme']
  .MuledMDXEditorHost
  .mdxeditor
  table
  > tbody
  > tr
  > th:not([data-tool-cell='true']) {
  border: 1px solid ${P.border};
  border-radius: 0;
  padding: 4px 8px;
}

[data-muled-wysiwyg-theme='acme']
  .MuledMDXEditorHost
  .mdxeditor
  table
  > tbody
  > tr
  > td:not([data-tool-cell='true']) {
  background: var(--wysiwyg-bg, ${P.bg});
}

[data-muled-wysiwyg-theme='acme']
  .MuledMDXEditorHost
  .mdxeditor
  table
  > tbody
  > tr:first-child
  > th:not([data-tool-cell='true']) {
  background: var(--wysiwyg-surface, ${P.header});
  font-weight: bold;
}

[data-muled-wysiwyg-theme='acme'] .MuledPlainCodeBlock__cm .cm-gutters {
  display: flex !important;
  background: ${P.scrollbarGutter} !important;
  color: ${P.fg} !important;
  border-right: 1px solid ${P.border} !important;
}
`.trim();
