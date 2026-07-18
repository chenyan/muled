import { patchWtermHiddenInputA11y } from '../renderer/lib/wtermInputA11y';

describe('patchWtermHiddenInputA11y', () => {
  it('removes aria-hidden from the wterm capture textarea', () => {
    const root = document.createElement('div');
    const textarea = document.createElement('textarea');
    textarea.setAttribute('aria-hidden', 'true');
    root.appendChild(textarea);

    patchWtermHiddenInputA11y(root);

    expect(textarea.hasAttribute('aria-hidden')).toBe(false);
    expect(textarea.getAttribute('aria-label')).toBe('Terminal input');
  });

  it('does not override an existing aria-label', () => {
    const root = document.createElement('div');
    const textarea = document.createElement('textarea');
    textarea.setAttribute('aria-hidden', 'true');
    textarea.setAttribute('aria-label', 'Python REPL');
    root.appendChild(textarea);

    patchWtermHiddenInputA11y(root);

    expect(textarea.getAttribute('aria-label')).toBe('Python REPL');
  });
});
