import { runPaletteCommand } from '../renderer/lib/runPaletteCommand';

describe('runPaletteCommand', () => {
  it('runs cd command', () => {
    const r = runPaletteCommand('cd ~/notes', {
      tabContent: '',
      selection: null,
    });
    expect(r).toEqual({ ok: true, kind: 'cd', path: '~/notes' });
  });

  it('substitutes in selection only', () => {
    expect(
      runPaletteCommand('s/foo/bar/g', {
        tabContent: 'foo bar foo',
        selection: { from: 0, to: 3 },
      }),
    ).toEqual({ ok: true, kind: 'substitute', content: 'bar bar foo' });
  });

  it('sets keybinding mode', () => {
    expect(
      runPaletteCommand('mode vim', { tabContent: '', selection: null }),
    ).toEqual({ ok: true, kind: 'mode', mode: 'vim' });
    expect(
      runPaletteCommand('mode normal', { tabContent: '', selection: null }),
    ).toEqual({ ok: true, kind: 'mode', mode: 'normal' });
  });

  it('substitutes full document without selection', () => {
    expect(
      runPaletteCommand('s/a/b/g', {
        tabContent: 'a a',
        selection: null,
      }),
    ).toEqual({ ok: true, kind: 'substitute', content: 'b b' });
  });
});
