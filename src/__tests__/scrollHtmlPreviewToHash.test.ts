import { scrollHtmlPreviewToHash } from '../renderer/lib/htmlPreviewNavigate';

describe('scrollHtmlPreviewToHash', () => {
  it('scrolls to named anchors with literal percent signs', () => {
    const doc = document.implementation.createHTMLDocument('test');
    const section = doc.createElement('a');
    section.setAttribute('name', '%_sec_3.1.3');
    doc.body.appendChild(section);
    section.scrollIntoView = jest.fn();

    expect(scrollHtmlPreviewToHash(doc, '%_sec_3.1.3')).toBe(true);
    expect(section.scrollIntoView).toHaveBeenCalled();
  });

  it('scrolls to element ids', () => {
    const doc = document.implementation.createHTMLDocument('test');
    const section = doc.createElement('h3');
    section.id = 'intro';
    doc.body.appendChild(section);
    section.scrollIntoView = jest.fn();

    expect(scrollHtmlPreviewToHash(doc, 'intro')).toBe(true);
    expect(section.scrollIntoView).toHaveBeenCalled();
  });
});
