import { getWysiwygContentRoot } from '../renderer/lib/wysiwygContentRoot';

describe('getWysiwygContentRoot', () => {
  function hostWith(html: string): HTMLElement {
    const host = document.createElement('div');
    host.innerHTML = html;
    return host;
  }

  it('prefers contenteditable=true', () => {
    const host = hostWith(`
      <div class="mdxeditor-root-contenteditable">
        <div contenteditable="true">editable</div>
      </div>
    `);
    const root = getWysiwygContentRoot(host);
    expect(root?.getAttribute('contenteditable')).toBe('true');
  });

  it('prefers role=textbox for read-only preview', () => {
    const host = hostWith(`
      <div class="mdxeditor-root-contenteditable">
        <div role="textbox" contenteditable="false" aria-readonly="true">read only</div>
      </div>
    `);
    const root = getWysiwygContentRoot(host);
    expect(root?.getAttribute('role')).toBe('textbox');
    expect(root?.textContent).toBe('read only');
  });

  it('falls back to contenteditable=false for read-only preview', () => {
    const host = hostWith(`
      <div class="mdxeditor-root-contenteditable">
        <div contenteditable="false">read only</div>
      </div>
    `);
    const root = getWysiwygContentRoot(host);
    expect(root?.getAttribute('contenteditable')).toBe('false');
    expect(root?.textContent).toBe('read only');
  });
});
