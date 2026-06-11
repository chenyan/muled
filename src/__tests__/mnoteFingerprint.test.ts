import {
  appendFingerprintToLoc,
  sha1PrefixHex,
} from '../renderer/lib/mnoteFingerprint';

describe('mnoteFingerprint', () => {
  it('computes stable sha1 prefix', () => {
    const a = sha1PrefixHex('hello world');
    const b = sha1PrefixHex('hello   world');
    expect(a).toBe(b);
    expect(a).toHaveLength(8);
  });

  it('appends fp to loc', () => {
    expect(appendFingerprintToLoc('lines=1-3', 'hello')).toMatch(
      /lines=1-3; fp=sha1:[0-9a-f]{8}/,
    );
  });
});
