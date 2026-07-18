import {
  editorViewModeLabel,
  nextEditorViewMode,
  nextViewModeForTab,
} from '../renderer/lib/editorViewMode';
import keybindingModePatch from '../renderer/lib/keybindingMode';

describe('editorViewMode', () => {
  it('labels all view modes', () => {
    expect(editorViewModeLabel('rich-text')).toBe('WYSIWYG');
    expect(editorViewModeLabel('source')).toBe('Markdown');
    expect(editorViewModeLabel('source', 'app.ts')).toBe('TypeScript');
    expect(editorViewModeLabel('source', 'main.py')).toBe('Python');
    expect(editorViewModeLabel('preview')).toBe('Preview');
    expect(editorViewModeLabel('agenda')).toBe('Agenda');
  });

  it('cycles rich-text → source → preview → rich-text', () => {
    expect(nextEditorViewMode('rich-text')).toBe('source');
    expect(nextEditorViewMode('source')).toBe('preview');
    expect(nextEditorViewMode('preview')).toBe('rich-text');
  });

  it('cycles html preview ↔ source', () => {
    expect(nextViewModeForTab('html', 'preview')).toBe('source');
    expect(nextViewModeForTab('html', 'source')).toBe('preview');
  });

  it('cycles ipynb notebook → preview → source', () => {
    expect(nextViewModeForTab('ipynb', 'notebook')).toBe('preview');
    expect(nextViewModeForTab('ipynb', 'preview')).toBe('source');
    expect(nextViewModeForTab('ipynb', 'source')).toBe('notebook');
  });

  it('defaults ipynb unknown view mode to preview', () => {
    expect(nextViewModeForTab('ipynb', 'rich-text')).toBe('preview');
  });

  it('labels notebook view mode', () => {
    expect(editorViewModeLabel('notebook')).toBe('Notebook');
  });

  it('cycles p5 preview ↔ source', () => {
    expect(nextViewModeForTab('p5', 'preview')).toBe('source');
    expect(nextViewModeForTab('p5', 'source')).toBe('preview');
  });

  it('cycles docx rich-text ↔ preview', () => {
    expect(nextViewModeForTab('docx', 'rich-text')).toBe('preview');
    expect(nextViewModeForTab('docx', 'preview')).toBe('rich-text');
  });

  it('cycles mnote rich-text ↔ source', () => {
    expect(nextViewModeForTab('mnote', 'rich-text')).toBe('source');
    expect(nextViewModeForTab('mnote', 'source')).toBe('rich-text');
  });

  it('cycles org preview → agenda → source', () => {
    expect(nextViewModeForTab('org', 'preview')).toBe('agenda');
    expect(nextViewModeForTab('org', 'agenda')).toBe('source');
    expect(nextViewModeForTab('org', 'source')).toBe('preview');
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

  it('switches to source when enabling vim from agenda', () => {
    expect(keybindingModePatch('agenda', 'vim')).toEqual({
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
