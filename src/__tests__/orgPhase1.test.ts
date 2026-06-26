import { parseOrgOutline } from '../renderer/lib/orgOutline';

describe('parseOrgOutline', () => {
  it('extracts org headings with depth from star count', () => {
    const content = [
      '* Top',
      '** TODO [#A] Sub :work:',
      '*** COMMENT Nested',
      '  - not a heading',
      'plain text',
    ].join('\n');
    const items = parseOrgOutline(content);
    expect(items.map((item) => item.title)).toEqual(['Top', 'Sub', 'Nested']);
    expect(items.map((item) => item.depth)).toEqual([1, 2, 3]);
    expect(items.map((item) => item.line)).toEqual([1, 2, 3]);
  });
});
