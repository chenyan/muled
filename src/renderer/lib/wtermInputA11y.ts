/**
 * @wterm/dom hides its keyboard-capture textarea with aria-hidden. Chrome blocks
 * that attribute when the textarea is focused (assistive tech must see focus).
 */
export function patchWtermHiddenInputA11y(terminalRoot: HTMLElement): void {
  const textarea = terminalRoot.querySelector('textarea');
  if (!(textarea instanceof HTMLTextAreaElement)) return;

  textarea.removeAttribute('aria-hidden');
  if (!textarea.hasAttribute('aria-label')) {
    textarea.setAttribute('aria-label', 'Terminal input');
  }
}
