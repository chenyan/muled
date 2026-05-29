import {
  $createCodeBlockNode,
  addImportVisitor$,
  realmPlugin,
  type MdastImportVisitor,
} from '@mdxeditor/editor';
import { $createParagraphNode, $createTextNode, type ElementNode, type LexicalNode } from 'lexical';
import type { Nodes } from 'mdast';
import {
  formatLinkDefinition,
  isCompositeInlineMdastNode,
  serializeMdastNodeForFallback,
} from './mdastFallbackSerialize';

const INLINE_LEAF_MDAST_TYPES = new Set<string>([
  'text',
  'emphasis',
  'strong',
  'delete',
  'inlineCode',
  'link',
  'image',
  'mdxJsxTextElement',
  'mdxTextExpression',
  'break',
]);

function isInlineMdastNode(node: Nodes): boolean {
  return (
    INLINE_LEAF_MDAST_TYPES.has(node.type) ||
    isCompositeInlineMdastNode(node)
  );
}

function canLexicalAppend(
  parent: LexicalNode,
): parent is ElementNode {
  return (
    typeof (parent as ElementNode).append === 'function' &&
    typeof (parent as ElementNode).getType === 'function'
  );
}

function appendTextToLexicalParent(
  lexicalParent: LexicalNode,
  text: string,
  formatting: number,
): void {
  const textNode = $createTextNode(text);
  textNode.setFormat(formatting);

  if (lexicalParent.getType() === 'root') {
    const paragraph = $createParagraphNode();
    paragraph.append(textNode);
    lexicalParent.append(paragraph);
    return;
  }

  if (canLexicalAppend(lexicalParent)) {
    lexicalParent.append(textNode);
  }
}

const MDAST_FALLBACK_VISITOR: MdastImportVisitor<Nodes> = {
  priority: -1000,
  testNode: () => true,
  visitNode({ mdastNode, lexicalParent, actions }) {
    if (mdastNode.type === 'definition') {
      appendTextToLexicalParent(
        lexicalParent,
        formatLinkDefinition(mdastNode),
        actions.getParentFormatting(),
      );
      return;
    }

    const raw = serializeMdastNodeForFallback(mdastNode);

    if (isInlineMdastNode(mdastNode)) {
      appendTextToLexicalParent(
        lexicalParent,
        raw,
        actions.getParentFormatting(),
      );
      return;
    }

    actions.addAndStepInto(
      $createCodeBlockNode({
        code: raw,
        language: 'txt',
        meta: '',
      }),
    );
  },
};

const mdxEditorFaultTolerancePlugin = realmPlugin({
  init(realm) {
    realm.pubIn({
      [addImportVisitor$]: MDAST_FALLBACK_VISITOR,
    });
  },
});

export default mdxEditorFaultTolerancePlugin;
