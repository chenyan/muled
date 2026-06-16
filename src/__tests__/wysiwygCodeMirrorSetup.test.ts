import { getIndentation } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { DEFAULT_EDITOR_INDENT } from '../shared/editorIndentConfig';
import { buildWysiwygCodeBlockExtensions } from '../renderer/lib/wysiwygCodeMirrorSetup';

describe('buildWysiwygCodeBlockExtensions', () => {
  function indentCol(doc: string, pos = doc.length) {
    const state = EditorState.create({
      doc,
      selection: { anchor: pos },
      extensions: buildWysiwygCodeBlockExtensions(
        'scheme',
        'light',
        DEFAULT_EDITOR_INDENT,
      ),
    });
    return getIndentation(state, pos);
  }

  it('includes scheme smart indent rules', () => {
    expect(indentCol('(define x\n')).toBe(2);
    expect(indentCol('(let ((a 1)\n')).toBe(6);
  });
});
