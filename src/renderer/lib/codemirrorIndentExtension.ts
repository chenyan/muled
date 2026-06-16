import { indentLess, indentMore } from '@codemirror/commands';
import { indentUnit } from '@codemirror/language';
import { EditorState, Prec, type Extension } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import type { EditorIndentSettings } from '../../shared/editorIndentConfig';
import { indentUnitString } from '../../shared/editorIndentConfig';

/** Tab / Shift-Tab 缩进，并阻止浏览器默认的焦点切换 */
export function buildCodeEditorIndentExtensions(
  settings: EditorIndentSettings,
): Extension[] {
  const unit = indentUnitString(settings);
  return [
    indentUnit.of(unit),
    EditorState.tabSize.of(settings.tab_size),
    Prec.highest(
      keymap.of([
        { key: 'Tab', run: indentMore },
        { key: 'Shift-Tab', run: indentLess },
      ]),
    ),
    EditorView.domEventHandlers({
      keydown(event) {
        if (
          event.key === 'Tab' &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.altKey
        ) {
          event.preventDefault();
          event.stopPropagation();
        }
        return false;
      },
    }),
  ];
}
