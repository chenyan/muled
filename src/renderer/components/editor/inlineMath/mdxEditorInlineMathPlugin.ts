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
import { unescapeHtmlAttr } from '../../../lib/denormalizeMarkdownMath';
import {
  splitTextWithInlineMath,
  textMayContainInlineMath,
} from '../../../lib/inlineMathDelimiters';
import { isMuledMathSpan } from '../../../lib/serializeMdastNodeToHtml';
import {
  $createInlineMathNode,
  $isInlineMathNode,
  InlineMathNode,
} from './InlineMathNode';

function readMuledMathAttribute(node: Nodes): string | null {
  if (!isMuledMathSpan(node)) {
    return null;
  }
  const attr = (
    node as Extract<Nodes, { type: 'mdxJsxTextElement' | 'mdxJsxFlowElement' }>
  ).attributes.find(
    (item) =>
      item.type === 'mdxJsxAttribute' && item.name === 'data-muled-math',
  );
  if (!attr || attr.type !== 'mdxJsxAttribute') {
    return null;
  }
  return typeof attr.value === 'string'
    ? unescapeHtmlAttr(attr.value)
    : null;
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
    node.type === 'text' && textMayContainInlineMath(node.value),
  visitNode({ mdastNode, lexicalParent, actions }) {
    if (!canLexicalAppend(lexicalParent)) {
      actions.nextVisitor();
      return;
    }
    const formatting = actions.getParentFormatting();
    for (const part of splitTextWithInlineMath(mdastNode.value)) {
      if (part.kind === 'text') {
        appendTextFragment(lexicalParent, part.text, formatting);
      } else {
        lexicalParent.append($createInlineMathNode(part.latex));
      }
    }
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
