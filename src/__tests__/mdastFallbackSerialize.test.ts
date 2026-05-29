import {
  formatLinkDefinition,
  formatLinkReference,
  serializeMdastNodeForFallback,
} from '../renderer/lib/mdastFallbackSerialize';

describe('mdastFallbackSerialize', () => {
  it('formats linkReference footnote markers', () => {
    expect(
      formatLinkReference({
        type: 'linkReference',
        label: '^1',
        identifier: '^1',
        referenceType: 'shortcut',
        children: [{ type: 'text', value: '^1' }],
      }),
    ).toBe('[^1]');
  });

  it('formats definition footnote lines', () => {
    expect(
      formatLinkDefinition({
        type: 'definition',
        identifier: '^1',
        label: '^1',
        title: null,
        url: '四川省汉源县',
      }),
    ).toBe('[^1]: 四川省汉源县');
  });

  it('serializes linkReference without visiting children', () => {
    const raw = serializeMdastNodeForFallback({
      type: 'linkReference',
      label: '^2',
      identifier: '^2',
      referenceType: 'shortcut',
      children: [{ type: 'text', value: '^2' }],
    });
    expect(raw).toBe('[^2]');
  });
});
