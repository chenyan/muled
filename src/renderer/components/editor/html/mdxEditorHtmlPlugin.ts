import {
  addExportVisitor$,
  addImportVisitor$,
  addLexicalNode$,
  realmPlugin,
  type LexicalExportVisitor,
  type MdastImportVisitor,
} from '@mdxeditor/editor';
import { type ElementNode, type LexicalNode } from 'lexical';
import type { Html, Nodes } from 'mdast';
import serializeMdastNodeToHtml, {
  isMuledMathSpan,
  type RenderableHtmlMdastNode,
} from '../../../lib/serializeMdastNodeToHtml';
import { $createHtmlNode, $isHtmlNode, HtmlNode } from './HtmlNode';

type MdxJsxFlowElement = Extract<Nodes, { type: 'mdxJsxFlowElement' }>;
type MdxJsxTextElement = Extract<Nodes, { type: 'mdxJsxTextElement' }>;

function canLexicalAppend(parent: LexicalNode): parent is ElementNode {
  return typeof (parent as ElementNode).append === 'function';
}

function appendHtmlNode(
  lexicalParent: LexicalNode,
  mdastNode: RenderableHtmlMdastNode,
  block: boolean,
): void {
  const html = serializeMdastNodeToHtml(mdastNode);
  if (!html.trim()) {
    return;
  }
  const node = $createHtmlNode(html, block);
  if (lexicalParent.getType() === 'root') {
    lexicalParent.append(node);
    return;
  }
  if (canLexicalAppend(lexicalParent)) {
    lexicalParent.append(node);
  }
}

const MDAST_HTML_VISITOR: MdastImportVisitor<Html> = {
  priority: 55,
  testNode: (node) => node.type === 'html',
  visitNode({ mdastNode, lexicalParent }) {
    appendHtmlNode(lexicalParent, mdastNode, lexicalParent.getType() === 'root');
  },
};

const MDAST_MDX_JSX_FLOW_HTML_VISITOR: MdastImportVisitor<MdxJsxFlowElement> = {
  priority: 55,
  testNode: (node) =>
    node.type === 'mdxJsxFlowElement' && !isMuledMathSpan(node),
  visitNode({ mdastNode, lexicalParent }) {
    appendHtmlNode(lexicalParent, mdastNode, true);
  },
};

const MDAST_MDX_JSX_TEXT_HTML_VISITOR: MdastImportVisitor<MdxJsxTextElement> = {
  priority: 45,
  testNode: (node) =>
    node.type === 'mdxJsxTextElement' && !isMuledMathSpan(node),
  visitNode({ mdastNode, lexicalParent }) {
    appendHtmlNode(lexicalParent, mdastNode, false);
  },
};

const LEXICAL_HTML_EXPORT_VISITOR: LexicalExportVisitor<HtmlNode, Html> = {
  testLexicalNode: $isHtmlNode,
  visitLexicalNode({ lexicalNode, mdastParent, actions }) {
    actions.appendToParent(mdastParent, {
      type: 'html',
      value: lexicalNode.getHtml(),
    });
  },
};

const mdxEditorHtmlPlugin = realmPlugin({
  init(realm) {
    realm.pubIn({
      [addLexicalNode$]: HtmlNode,
      [addImportVisitor$]: [
        MDAST_HTML_VISITOR,
        MDAST_MDX_JSX_FLOW_HTML_VISITOR,
        MDAST_MDX_JSX_TEXT_HTML_VISITOR,
      ],
      [addExportVisitor$]: LEXICAL_HTML_EXPORT_VISITOR,
    });
  },
});

export default mdxEditorHtmlPlugin;
