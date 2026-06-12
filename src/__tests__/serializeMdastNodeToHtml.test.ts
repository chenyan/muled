import serializeMdastNodeToHtml, {
  isMuledMathSpan,
} from '../renderer/lib/serializeMdastNodeToHtml';

describe('serializeMdastNodeToHtml', () => {
  it('serializes raw html nodes', () => {
    expect(
      serializeMdastNodeToHtml({
        type: 'html',
        value: '<div class="x">Hi</div>',
      }),
    ).toBe('<div class="x">Hi</div>');
  });

  it('serializes inline JSX HTML', () => {
    expect(
      serializeMdastNodeToHtml({
        type: 'mdxJsxTextElement',
        name: 'span',
        attributes: [
          {
            type: 'mdxJsxAttribute',
            name: 'class',
            value: 'x',
          },
        ],
        children: [{ type: 'text', value: 'Hi' }],
      }),
    ).toBe('<span class="x">Hi</span>');
  });

  it('serializes block JSX HTML', () => {
    const html = serializeMdastNodeToHtml({
      type: 'mdxJsxFlowElement',
      name: 'div',
      attributes: [],
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'mdxJsxTextElement',
              name: 'p',
              attributes: [],
              children: [{ type: 'text', value: 'Block' }],
            },
          ],
        },
      ],
    });
    expect(html).toContain('<div>');
    expect(html).toContain('<p>Block</p>');
  });

  it('does not treat muled math spans as HTML', () => {
    expect(
      isMuledMathSpan({
        type: 'mdxJsxTextElement',
        name: 'span',
        attributes: [{ type: 'mdxJsxAttribute', name: 'data-muled-math' }],
      }),
    ).toBe(true);
    expect(
      isMuledMathSpan({
        type: 'mdxJsxFlowElement',
        name: 'span',
        attributes: [{ type: 'mdxJsxAttribute', name: 'data-muled-math' }],
      }),
    ).toBe(true);
  });
});
