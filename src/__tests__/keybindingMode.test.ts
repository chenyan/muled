import {
  editorViewModeLabel,
  nextEditorViewMode,
} from '../renderer/lib/editorViewMode';
import keybindingModePatch from '../renderer/lib/keybindingMode';

describe('editorViewMode', () => {
  it('labels all view modes', () => {
    expect(editorViewModeLabel('rich-text')).toBe('WYSIWYG');
    expect(editorViewModeLabel('source')).toBe('Source');
    expect(editorViewModeLabel('preview')).toBe('Preview');
  });

  it('cycles rich-text → source → preview → rich-text', () => {
    expect(nextEditorViewMode('rich-text')).toBe('source');
    expect(nextEditorViewMode('source')).toBe('preview');
    expect(nextEditorViewMode('preview')).toBe('rich-text');
  });
});

describe('keybindingModePatch', () => {
  it('switches to source when enabling vim from rich-text', () => {
    expect(keybindingModePatch('rich-text', 'vim')).toEqual({
      keybindingMode: 'vim',
      viewMode: 'source',
    });
  });

  it('switches to source when enabling vim from preview', () => {
    expect(keybindingModePatch('preview', 'vim')).toEqual({
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
