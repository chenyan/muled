import {
  buildCommonSourceUiExtensions,
  flattenExtensions,
} from '../renderer/lib/codemirrorSetup';

describe('codemirrorSetup', () => {
  it('flattenExtensions expands nested arrays and skips nullish', () => {
    const inner = [{ toString: () => 'b' }];
    const outer = { toString: () => 'a' };
    const flat = flattenExtensions([
      outer as never,
      inner as never,
      undefined,
      null,
    ]);
    expect(flat).toHaveLength(2);
  });

  it('buildCommonSourceUiExtensions returns non-empty flat list', () => {
    const exts = buildCommonSourceUiExtensions('light');
    expect(exts.length).toBeGreaterThan(0);
    expect(exts.every((e) => e != null)).toBe(true);
  });
});
