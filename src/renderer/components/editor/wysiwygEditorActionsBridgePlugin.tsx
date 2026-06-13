import { addComposerChild$, realmPlugin } from '@mdxeditor/editor';
import { useRealm } from '@mdxeditor/gurx';
import { useEffect } from 'react';
import {
  registerWysiwygEditorRealm,
  unregisterWysiwygEditorRealm,
} from '../../lib/wysiwygEditorActions';

function WysiwygEditorActionsBridge() {
  const realm = useRealm();

  useEffect(() => {
    registerWysiwygEditorRealm(realm);
    return () => unregisterWysiwygEditorRealm(realm);
  }, [realm]);

  return null;
}

const wysiwygEditorActionsBridgePlugin = realmPlugin({
  init(realm) {
    realm.pub(addComposerChild$, WysiwygEditorActionsBridge);
  },
});

export default wysiwygEditorActionsBridgePlugin;
