import {
  addComposerChild$,
  defaultCodeBlockLanguage$,
  realmPlugin,
} from '@mdxeditor/editor';
import { useCellValue } from '@mdxeditor/gurx';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect } from 'react';
import { registerTripleBacktickCodeBlockShortcut } from '../../lib/registerTripleBacktickCodeBlockShortcut';

function TripleBacktickCodeBlockShortcut() {
  const [editor] = useLexicalComposerContext();
  const defaultLanguage = useCellValue(defaultCodeBlockLanguage$);

  useEffect(
    () => registerTripleBacktickCodeBlockShortcut(editor, defaultLanguage),
    [defaultLanguage, editor],
  );

  return null;
}

const mdxEditorTripleBacktickShortcutPlugin = realmPlugin({
  init(realm) {
    realm.pub(addComposerChild$, TripleBacktickCodeBlockShortcut);
  },
});

export default mdxEditorTripleBacktickShortcutPlugin;
