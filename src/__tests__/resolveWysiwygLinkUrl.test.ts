/** @jest-environment jsdom */
import { resolveWysiwygLinkUrl } from '../renderer/lib/resolveWysiwygLinkUrl';
import { WIKI_LINK_SRC_PREFIX } from '../renderer/lib/normalizeMarkdownWikiLinks';
import { isExternalLinkHref, isWikiLinkHref } from '../renderer/lib/wysiwygLinkClick';

function hostWith(html: string): HTMLElement {
  const host = document.createElement('div');
  host.className = 'MuledMDXEditorHost';
  host.innerHTML = html;
  return host;
}

describe('resolveWysiwygLinkUrl', () => {
  it('does not treat [[...]] inside inline code as a wiki link', () => {
    const host = hostWith(`
      <div class="mdxeditor-root-contenteditable">
        <div contenteditable="true">
          <ul>
            <li>
              <strong>WYSIWYG 反引号内字面量</strong>：行内代码
              <code>[[...]]</code> 中的说明文字。
            </li>
          </ul>
        </div>
      </div>
    `);

    const li = host.querySelector('li')!;
    const code = host.querySelector('code')!;
    const editable = host.querySelector('[contenteditable="true"]')!;

    expect(resolveWysiwygLinkUrl(code, host)).toBeNull();
    expect(resolveWysiwygLinkUrl(li, host)).toBeNull();
    expect(resolveWysiwygLinkUrl(editable, host)).toBeNull();
  });

  it('still resolves plain [[page]] text outside inline code', () => {
    const host = hostWith(`
      <div class="mdxeditor-root-contenteditable">
        <div contenteditable="true">
          <p>跳转到 [[My Page]] 继续阅读。</p>
        </div>
      </div>
    `);

    const wikiText = host.querySelector('p')!.firstChild as Text;
    expect(resolveWysiwygLinkUrl(wikiText, host)).toBe(
      `${WIKI_LINK_SRC_PREFIX}${encodeURIComponent('My Page')}`,
    );
  });

  it('ignores ![[...mp4]] wiki embed syntax in inline code', () => {
    const host = hostWith(`
      <div class="mdxeditor-root-contenteditable">
        <div contenteditable="true">
          <ul>
            <li>wiki 视频 <code>![[clip.mp4]]</code> 载入示例。</li>
          </ul>
        </div>
      </div>
    `);

    const li = host.querySelector('li')!;
    expect(resolveWysiwygLinkUrl(li, host)).toBeNull();
  });
});

describe('wysiwyg link href helpers', () => {
  it('detects wiki links in hash-only and absolute hrefs', () => {
    expect(isWikiLinkHref('#muled-wiki:page')).toBe(true);
    expect(
      isWikiLinkHref('http://localhost:1212/index.html#muled-wiki:page'),
    ).toBe(true);
    expect(isExternalLinkHref('https://example.com')).toBe(true);
  });
});
