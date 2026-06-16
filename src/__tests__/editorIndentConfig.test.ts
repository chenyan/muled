import { indentMore } from '@codemirror/commands';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import {
  DEFAULT_EDITOR_INDENT,
  indentUnitString,
  parseEditorIndentSettings,
} from '../shared/editorIndentConfig';
import { buildCodeEditorIndentExtensions } from '../renderer/lib/codemirrorIndentExtension';

describe('parseEditorIndentSettings', () => {
  it('uses defaults for missing values', () => {
    expect(parseEditorIndentSettings(undefined)).toEqual(DEFAULT_EDITOR_INDENT);
  });

  it('parses custom tab size and insert_spaces', () => {
    expect(
      parseEditorIndentSettings({ tab_size: 4, insert_spaces: false }),
    ).toEqual({ insert_spaces: false, tab_size: 4 });
  });

  it('clamps invalid tab size', () => {
    expect(parseEditorIndentSettings({ tab_size: 99 }).tab_size).toBe(2);
  });
});

describe('indentUnitString', () => {
  it('returns spaces or tab based on settings', () => {
    expect(indentUnitString({ insert_spaces: true, tab_size: 4 })).toBe(
      '    ',
    );
    expect(indentUnitString({ insert_spaces: false, tab_size: 4 })).toBe('\t');
  });
});

describe('buildCodeEditorIndentExtensions', () => {
  it('inserts configured spaces on Tab', () => {
    const parent = document.createElement('div');
    const view = new EditorView({
      parent,
      state: EditorState.create({
        doc: 'x',
        selection: { anchor: 1 },
        extensions: buildCodeEditorIndentExtensions({
          insert_spaces: true,
          tab_size: 4,
        }),
      }),
    });
    indentMore(view);
    expect(view.state.doc.toString()).toBe('    x');
    view.destroy();
  });
});
