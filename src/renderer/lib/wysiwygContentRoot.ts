/** WYSIWYG / Preview 共用的 MDXEditor 正文根节点（readOnly 时为 contenteditable="false"） */
export function getWysiwygContentRoot(host: HTMLElement): HTMLElement | null {
  const textbox = host.querySelector(
    '.mdxeditor-root-contenteditable [role="textbox"]',
  );
  if (textbox instanceof HTMLElement) {
    return textbox;
  }

  const editable = host.querySelector(
    '.mdxeditor-root-contenteditable [contenteditable="true"]',
  );
  if (editable instanceof HTMLElement) {
    return editable;
  }

  const readOnly = host.querySelector(
    '.mdxeditor-root-contenteditable [contenteditable="false"]',
  );
  if (readOnly instanceof HTMLElement) {
    return readOnly;
  }

  const root = host.querySelector('.mdxeditor-root-contenteditable');
  return root instanceof HTMLElement ? root : null;
}
