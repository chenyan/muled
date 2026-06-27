import { describePtySpawnFailure, sanitizeSpawnEnv } from '../main/ptySpawn';

describe('sanitizeSpawnEnv', () => {
  it('keeps only string values', () => {
    expect(
      sanitizeSpawnEnv({
        PATH: '/usr/bin',
        EMPTY: '',
        BAD: undefined,
        ALSO_BAD: null as unknown as string,
      }),
    ).toEqual({ PATH: '/usr/bin', EMPTY: '' });
  });
});

describe('describePtySpawnFailure', () => {
  it('passes through unrelated errors', () => {
    expect(describePtySpawnFailure('ENOENT')).toBe('ENOENT');
  });

  it('adds rebuild guidance for posix_spawnp failures', () => {
    const message = describePtySpawnFailure('posix_spawnp failed.');
    expect(message).toContain('posix_spawnp failed.');
    expect(message).toContain('npm run rebuild');
  });
});
