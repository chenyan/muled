import {
  isPointerBelowWysiwygContent,
} from '../renderer/lib/wysiwygFocusDocumentEnd';

function hostWith(html: string): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host;
}

describe('isPointerBelowWysiwygContent', () => {
  it('returns true when pointer is below the last block', () => {
    const host = hostWith(`
      <div class="mdxeditor-root-contenteditable">
        <div contenteditable="true">
          <p id="p1">Line one</p>
          <p id="p2">Line two</p>
        </div>
      </div>
    `);
    const last = host.querySelector('#p2') as HTMLElement;
    last.getBoundingClientRect = () =>
      ({
        top: 40,
        bottom: 60,
        left: 0,
        right: 100,
        width: 100,
        height: 20,
        x: 0,
        y: 40,
        toJSON: () => ({}),
      }) as DOMRect;
    expect(isPointerBelowWysiwygContent(host, 70)).toBe(true);
  });

  it('returns false when pointer is on the last block', () => {
    const host = hostWith(`
      <div class="mdxeditor-root-contenteditable">
        <div contenteditable="true">
          <p id="p1">Line one</p>
        </div>
      </div>
    `);
    const block = host.querySelector('#p1') as HTMLElement;
    block.getBoundingClientRect = () =>
      ({
        top: 10,
        bottom: 30,
        left: 0,
        right: 100,
        width: 100,
        height: 20,
        x: 0,
        y: 10,
        toJSON: () => ({}),
      }) as DOMRect;
    expect(isPointerBelowWysiwygContent(host, 20)).toBe(false);
  });

  it('returns true for empty document clicks inside content root', () => {
    const host = hostWith(`
      <div class="mdxeditor-root-contenteditable">
        <div contenteditable="true"></div>
      </div>
    `);
    const editable = host.querySelector('[contenteditable="true"]') as HTMLElement;
    editable.getBoundingClientRect = () =>
      ({
        top: 0,
        bottom: 200,
        left: 0,
        right: 100,
        width: 100,
        height: 200,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;
    expect(isPointerBelowWysiwygContent(host, 1)).toBe(true);
  });
});
