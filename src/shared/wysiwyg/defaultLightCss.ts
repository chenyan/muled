/** 首次启动写入 ~/.config/muled/wysiwyg/light.css 的默认内容 */
export default `
/* Muled WYSIWYG — light theme (可编辑) */

[data-muled-wysiwyg-theme='light'] {
  --wysiwyg-palette: 2;
}

.MuledMDXEditor__errorFallback {
  margin: 1rem;
  padding: 0.75rem 1rem;
  border: 1px solid #fecaca;
  border-radius: 6px;
  background: #fef2f2;
  color: #991b1b;
  font-size: 13px;
}

.MuledMDXEditor__errorFallback button {
  margin-top: 0.5rem;
  padding: 0.25rem 0.75rem;
  border: 1px solid #fca5a5;
  border-radius: 4px;
  background: #fff;
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
  background: #fff;
  color: #18181b;
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
  color: #18181b;
}

.MuledMDXEditorHost .mdxeditor a {
  color: #2563eb;
}

.MuledMDXEditorHost .mdxeditor blockquote {
  border-left: 3px solid #d4d4d8;
  color: #52525b;
}

.MuledMDXEditorHost .mdxeditor hr {
  border-color: #e4e4e7;
}

.MuledMDXEditorHost .mdxeditor [data-editor-block-type='image'] img {
  max-width: 80%;
  height: auto;
}

.MuledCodeBlockWithPreview {
  display: flex;
  flex-direction: column;
  border: 1px solid #e4e4e7;
  border-radius: 6px;
  overflow: hidden;
  margin: 8px 0;
  background: #fff;
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
  color: #71717a;
  background: #f4f4f5;
  border-bottom: 1px solid #e4e4e7;
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
  background: #fafafa;
  color: #18181b;
}

.MuledCodeBlockWithPreview__preview {
  border-top: 1px solid #e4e4e7;
  padding: 12px 16px;
  overflow: visible;
  background: #fafafa;
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
  outline: 2px solid #a1a1aa;
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
  outline: 2px solid #a1a1aa;
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
}

.MuledInlineMath--error {
  color: #b91c1c;
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
  border: 1px solid #e4e4e7;
  padding: 6px 10px;
  text-align: left;
  vertical-align: top;
}

.MuledFrontmatterTable td:first-child {
  width: 28%;
  color: #71717a;
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
  color: #b91c1c;
  background: #fef2f2;
  border-top: 1px solid #fecaca;
}

.MuledCodeBlockWithPreview__empty {
  margin: 0;
  font-size: 12px;
  color: #a1a1aa;
}

.MuledPlainCodeBlock {
  position: relative;
  margin: 8px 0;
  border: 1px solid #e4e4e7;
  border-radius: 6px;
  overflow: hidden;
  background: #fafafa;
}

.MuledPlainCodeBlock__header {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 2px 6px;
  border-bottom: 1px solid #e4e4e7;
  background: rgba(244, 244, 245, 0.72);
}

.MuledPlainCodeBlock__label {
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: #71717a;
  background: rgba(244, 244, 245, 0.88);
  border: 1px solid #e4e4e7;
  border-radius: 4px;
  min-width: 3ch;
  max-width: 16ch;
  cursor: text;
  outline: none;
  box-sizing: border-box;
}

.MuledPlainCodeBlock__label:focus {
  color: #18181b;
  border-color: #a1a1aa;
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
  color: #71717a;
}
`.trim();
