import { getCdPaletteCompletion } from '../shared/paletteAutoCompletion';

describe('getCdPaletteCompletion', () => {
  const candidates = ['~/projects', '~/projects/muled', '/var/log'];

  it('returns ghost suffix for partial cd path', () => {
    expect(getCdPaletteCompletion('cd ~/proj', candidates, 0)).toEqual({
      completedLine: 'cd ~/projects',
      ghostSuffix: 'ects',
      matchCount: 2,
    });
  });

  it('cycles candidates with cycleIndex', () => {
    expect(getCdPaletteCompletion('cd ~/proj', candidates, 1)).toEqual({
      completedLine: 'cd ~/projects/muled',
      ghostSuffix: 'ects/muled',
      matchCount: 2,
    });
  });

  it('returns null for non-cd commands', () => {
    expect(getCdPaletteCompletion('mode vim', candidates, 0)).toBeNull();
  });

  it('returns null when nothing extends the partial', () => {
    expect(
      getCdPaletteCompletion('cd ~/projects', ['~/projects'], 0),
    ).toBeNull();
  });
});
