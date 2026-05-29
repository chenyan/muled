import {
  addExportVisitor$,
  addImportVisitor$,
  addLexicalNode$,
  realmPlugin,
  type MdastImportVisitor,
  type LexicalExportVisitor,
} from '@mdxeditor/editor';
import { $createTextNode, type ElementNode, type LexicalNode } from 'lexical';
import type { Nodes, Text } from 'mdast';
import {
  $createInlineMathNode,
  $isInlineMathNode,
  InlineMathNode,
} from './InlineMathNode';

const INLINE_MATH_IN_TEXT = /(?<!\$)\$(?!\$)((?:\\.|[^$\\\n])+?)\$(?!\$)/g;

function readMuledMathAttribute(node: Nodes): string | null {
  if (node.type !== 'mdxJsxTextElement' || node.name !== 'span') {
    return null;
  }
  const attr = node.attributes.find(
    (item) =>
      item.type === 'mdxJsxAttribute' && item.name === 'data-muled-math',
  );
  if (!attr || attr.type !== 'mdxJsxAttribute') {
    return null;
  }
  return typeof attr.value === 'string' ? attr.value : null;
}

function canLexicalAppend(parent: LexicalNode): parent is ElementNode {
  return typeof (parent as ElementNode).append === 'function';
}

function appendTextFragment(
  parent: ElementNode,
  value: string,
  formatting: number,
): void {
  if (!value) {
    return;
  }
  const textNode = $createTextNode(value);
  textNode.setFormat(formatting);
  parent.append(textNode);
}

const MDAST_INLINE_MATH_SPAN_VISITOR: MdastImportVisitor<Nodes> = {
  priority: 50,
  testNode: (node) => readMuledMathAttribute(node) !== null,
  visitNode({ mdastNode, lexicalParent, actions }) {
    const latex = readMuledMathAttribute(mdastNode);
    if (!latex) {
      return;
    }
    if (!canLexicalAppend(lexicalParent)) {
      actions.nextVisitor();
      return;
    }
    lexicalParent.append($createInlineMathNode(latex));
  },
};

const MDAST_INLINE_MATH_TEXT_VISITOR: MdastImportVisitor<Text> = {
  priority: 40,
  testNode: (node) =>
    node.type === 'text' && INLINE_MATH_IN_TEXT.test(node.value),
  visitNode({ mdastNode, lexicalParent, actions }) {
    if (!canLexicalAppend(lexicalParent)) {
      actions.nextVisitor();
      return;
    }
    const formatting = actions.getParentFormatting();
    const value = mdastNode.value;
    INLINE_MATH_IN_TEXT.lastIndex = 0;
    let lastIndex = 0;
    let match = INLINE_MATH_IN_TEXT.exec(value);
    while (match) {
      appendTextFragment(lexicalParent, value.slice(lastIndex, match.index), formatting);
      lexicalParent.append($createInlineMathNode(match[1]));
      lastIndex = match.index + match[0].length;
      match = INLINE_MATH_IN_TEXT.exec(value);
    }
    appendTextFragment(lexicalParent, value.slice(lastIndex), formatting);
  },
};

const LEXICAL_INLINE_MATH_EXPORT_VISITOR: LexicalExportVisitor<
  InlineMathNode,
  Text
> = {
  testLexicalNode: $isInlineMathNode,
  visitLexicalNode({ lexicalNode, mdastParent, actions }) {
    actions.appendToParent(mdastParent, {
      type: 'text',
      value: `$${lexicalNode.getLatex()}$`,
    });
  },
};

const mdxEditorInlineMathPlugin = realmPlugin({
  init(realm) {
    realm.pubIn({
      [addLexicalNode$]: InlineMathNode,
      [addImportVisitor$]: [
        MDAST_INLINE_MATH_SPAN_VISITOR,
        MDAST_INLINE_MATH_TEXT_VISITOR,
      ],
      [addExportVisitor$]: LEXICAL_INLINE_MATH_EXPORT_VISITOR,
    });
  },
});

export default mdxEditorInlineMathPlugin;
