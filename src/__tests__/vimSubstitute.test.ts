import {
  applyVimSubstitute,
  parseCdCommand,
  parseVimSubstituteCommand,
} from '../renderer/lib/vimSubstitute';

describe('parseVimSubstituteCommand', () => {
  it('parses basic substitute', () => {
    expect(parseVimSubstituteCommand('s/foo/bar/g')).toEqual({
      ok: true,
      spec: { pattern: 'foo', replacement: 'bar', flags: 'g' },
    });
  });

  it('parses leading colon and percent', () => {
    expect(parseVimSubstituteCommand(':s/a/b/i').ok).toBe(true);
    expect(parseVimSubstituteCommand('%s/a/b/').ok).toBe(true);
  });

  it('supports escaped delimiters', () => {
    const r = parseVimSubstituteCommand(String.raw`s/\/usr\/local/\/opt/g`);
    expect(r).toEqual({
      ok: true,
      spec: { pattern: '/usr/local', replacement: '/opt', flags: 'g' },
    });
  });

  it('rejects invalid flags', () => {
    const r = parseVimSubstituteCommand('s/a/b/x');
    expect(r.ok).toBe(false);
  });
});

describe('applyVimSubstitute', () => {
  it('replaces globally', () => {
    expect(
      applyVimSubstitute('foo bar foo', {
        pattern: 'foo',
        replacement: 'baz',
        flags: 'g',
      }),
    ).toBe('baz bar baz');
  });

  it('replaces once without g flag', () => {
    expect(
      applyVimSubstitute('foo foo', {
        pattern: 'foo',
        replacement: 'x',
        flags: '',
      }),
    ).toBe('x foo');
  });

  it('ignores case with i flag', () => {
    expect(
      applyVimSubstitute('Foo foo', {
        pattern: 'foo',
        replacement: 'x',
        flags: 'gi',
      }),
    ).toBe('x x');
  });
});

describe('parseCdCommand', () => {
  it('extracts path', () => {
    expect(parseCdCommand('cd ~/notes')).toEqual({ ok: true, path: '~/notes' });
  });

  it('rejects empty path', () => {
    expect(parseCdCommand('cd ').ok).toBe(false);
  });
});
