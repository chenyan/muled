import {
  buildShellProcessEnv,
  prependCommonBinDirs,
} from '../main/shellPath';

describe('prependCommonBinDirs', () => {
  it('prepends homebrew paths when missing', () => {
    const next = prependCommonBinDirs('/usr/bin:/bin');
    expect(next.startsWith('/opt/homebrew/bin')).toBe(true);
    expect(next).toContain('/usr/bin');
    expect(next).toContain('/bin');
  });

  it('does not duplicate dirs already in PATH', () => {
    const input = '/opt/homebrew/bin:/usr/bin';
    const next = prependCommonBinDirs(input);
    expect(next.split(':').filter((dir) => dir === '/opt/homebrew/bin')).toHaveLength(
      1,
    );
    expect(next).toContain('/usr/bin');
  });
});

describe('buildShellProcessEnv', () => {
  it('sets PATH on the returned env', () => {
    const env = buildShellProcessEnv({ HOME: '/tmp' });
    const pathKey = process.platform === 'win32' ? 'Path' : 'PATH';
    expect(env[pathKey]).toBeTruthy();
    expect(env[pathKey]).toContain('/opt/homebrew/bin');
  });
});
