/** 首次启动写入 ~/.config/muled/wysiwyg/dark.css 的默认内容 */
export default `
/* Muled WYSIWYG — dark theme (可编辑) */

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
  background: #1c1917;
  color: inherit;
  cursor: pointer;
}

.MuledMDXEditorHost .mdxeditor.MuledMDXEditor {
  display: block;
  height: auto;
  min-height: 100%;
  border: none;
  border-radius: 0;
  overflow: visible;
  background: #18181b;
  color: #e4e4e7;
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

.MuledMDXEditorHost .mdxeditor-root-contenteditable [contenteditable='true'] {
  min-height: 2rem;
}

.MuledMDXEditorHost .mdxeditor h1,
.MuledMDXEditorHost .mdxeditor h2,
.MuledMDXEditorHost .mdxeditor h3,
.MuledMDXEditorHost .mdxeditor h4,
.MuledMDXEditorHost .mdxeditor h5,
.MuledMDXEditorHost .mdxeditor h6 {
  color: #fafafa;
}

.MuledMDXEditorHost .mdxeditor a {
  color: #60a5fa;
}

.MuledMDXEditorHost .mdxeditor blockquote {
  border-left: 3px solid #52525b;
  color: #a1a1aa;
}

.MuledMDXEditorHost .mdxeditor hr {
  border-color: #3f3f46;
}

.MuledMDXEditorHost .mdxeditor [data-editor-block-type='image'] img {
  max-width: 80%;
  height: auto;
}

.MuledCodeBlockWithPreview {
  display: flex;
  flex-direction: column;
  border: 1px solid #3f3f46;
  border-radius: 6px;
  overflow: hidden;
  margin: 8px 0;
  background: #27272a;
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
  color: #a1a1aa;
  background: #18181b;
  border-bottom: 1px solid #3f3f46;
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
  background: #09090b;
  color: #e4e4e7;
}

.MuledCodeBlockWithPreview__preview {
  border-top: 1px solid #3f3f46;
  padding: 12px 16px;
  overflow: visible;
  background: #09090b;
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
  outline: 2px solid #71717a;
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
  outline: 2px solid #71717a;
  outline-offset: 2px;
  border-radius: 4px;
}

.MuledCodeBlockWithPreview__preview--mathOnly .katex-display {
  margin: 0.5em 0;
}

.MuledInlineMath {
  display: inline-block;
  vertical-align: middle;
  margin: 0 0.1em;
  max-width: 100%;
}

.MuledInlineMath .katex {
  font-size: 1em;
}

.MuledInlineMath--error {
  color: #fca5a5;
}

.MuledInlineMath--empty {
  display: inline-block;
  min-width: 0.5em;
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
  color: #71717a;
}

.MuledPlainCodeBlock {
  margin: 8px 0;
  border: 1px solid #3f3f46;
  border-radius: 6px;
  overflow: hidden;
  background: #09090b;
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
`.trim();
