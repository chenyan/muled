import {
  activeEditor$,
  applyFormat$,
  convertSelectionToNode$,
  contentEditableRef$,
  insertCodeBlock$,
  insertMarkdown$,
  insertTable$,
} from '@mdxeditor/editor';
import type { Realm } from '@mdxeditor/gurx';
import { $createQuoteNode } from '@lexical/rich-text';
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
} from 'lexical';
import { $createInlineMathNode } from '../components/editor/inlineMath/InlineMathNode';

export type WysiwygEditorAction =
  | 'cut'
  | 'copy'
  | 'paste'
  | 'pastePlainText'
  | 'bold'
  | 'italic'
  | 'strikethrough'
  | 'highlight'
  | 'code'
  | 'inlineMath'
  | 'comment'
  | 'clearFormat'
  | 'paragraph'
  | 'quote'
  | 'insertTable'
  | 'insertCodeBlock'
  | 'insertMathBlock';

let activeRealm: Realm | null = null;

export function registerWysiwygEditorRealm(realm: Realm): void {
  activeRealm = realm;
}

export function unregisterWysiwygEditorRealm(realm: Realm): void {
  if (activeRealm === realm) {
    activeRealm = null;
  }
}

function requireRealm(): Realm | null {
  return activeRealm;
}

function focusContentEditable(realm: Realm): void {
  realm.getValue(contentEditableRef$)?.current?.focus({ preventScroll: true });
}

function runClipboardCommand(realm: Realm, command: 'cut' | 'copy' | 'paste'): void {
  focusContentEditable(realm);
  document.execCommand(command);
}

function clearSelectionFormat(realm: Realm): void {
  const editor = realm.getValue(activeEditor$);
  if (!editor) {
    return;
  }
  editor.update(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) {
      return;
    }
    for (const node of selection.getNodes()) {
      if ($isTextNode(node)) {
        node.setFormat(0);
      }
    }
  });
}

function insertInlineMath(realm: Realm): void {
  const editor = realm.getValue(activeEditor$);
  if (!editor) {
    return;
  }
  editor.update(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) {
      return;
    }
    const latex = selection.getTextContent().trim() || 'x';
    if (!selection.isCollapsed()) {
      selection.removeText();
    }
    selection.insertNodes([$createInlineMathNode(latex)]);
  });
  focusContentEditable(realm);
}

function insertComment(realm: Realm): void {
  const selection = window.getSelection()?.toString() ?? '';
  const body = selection.trim() || '注释';
  realm.pub(insertMarkdown$, `<!-- ${body} -->`);
  focusContentEditable(realm);
}

export function runWysiwygEditorAction(action: WysiwygEditorAction): boolean {
  const realm = requireRealm();
  if (!realm) {
    return false;
  }

  switch (action) {
    case 'cut':
      runClipboardCommand(realm, 'cut');
      return true;
    case 'copy':
      runClipboardCommand(realm, 'copy');
      return true;
    case 'paste':
      runClipboardCommand(realm, 'paste');
      return true;
    case 'pastePlainText':
      void navigator.clipboard.readText().then((text) => {
        if (!text) {
          return;
        }
        const editor = realm.getValue(activeEditor$);
        if (!editor) {
          return;
        }
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            selection.insertRawText(text);
          }
        });
        focusContentEditable(realm);
      });
      return true;
    case 'bold':
    case 'italic':
    case 'strikethrough':
    case 'highlight':
    case 'code':
      realm.pub(applyFormat$, action === 'code' ? 'code' : action);
      focusContentEditable(realm);
      return true;
    case 'inlineMath':
      insertInlineMath(realm);
      return true;
    case 'comment':
      insertComment(realm);
      return true;
    case 'clearFormat':
      clearSelectionFormat(realm);
      focusContentEditable(realm);
      return true;
    case 'paragraph':
      realm.pub(convertSelectionToNode$, () => $createParagraphNode());
      return true;
    case 'quote':
      realm.pub(convertSelectionToNode$, () => $createQuoteNode());
      return true;
    case 'insertTable':
      realm.pub(insertTable$, { rows: 3, columns: 3 });
      return true;
    case 'insertCodeBlock':
      realm.pub(insertCodeBlock$, {});
      return true;
    case 'insertMathBlock':
      realm.pub(insertCodeBlock$, { language: 'math', code: '' });
      return true;
    default:
      return false;
  }
}
