import buildSourceCodeMirrorExtensions from '../renderer/lib/codemirrorExtensions';

describe('buildSourceCodeMirrorExtensions', () => {
  it('includes vim plus safety extensions when mode is vim', () => {
    expect(buildSourceCodeMirrorExtensions('vim').length).toBeGreaterThan(1);
  });

  it('returns base safety extensions for normal mode', () => {
    expect(buildSourceCodeMirrorExtensions('normal')).toHaveLength(3);
  });
});
