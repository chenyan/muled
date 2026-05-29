import keybindingModePatch from '../renderer/lib/keybindingMode';

describe('keybindingModePatch', () => {
  it('switches to source when enabling vim from rich-text', () => {
    expect(keybindingModePatch('rich-text', 'vim')).toEqual({
      keybindingMode: 'vim',
      viewMode: 'source',
    });
  });

  it('keeps view when already in source', () => {
    expect(keybindingModePatch('source', 'vim')).toEqual({
      keybindingMode: 'vim',
    });
  });

  it('does not change view for normal mode', () => {
    expect(keybindingModePatch('rich-text', 'normal')).toEqual({
      keybindingMode: 'normal',
    });
  });
});
