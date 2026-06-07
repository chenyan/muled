import {
  addExportVisitor$,
  addImportVisitor$,
  addLexicalNode$,
  realmPlugin,
  type LexicalExportVisitor,
  type MdastImportVisitor,
} from '@mdxeditor/editor';
import type { RefObject } from 'react';
import type { Image, Text } from 'mdast';
import {
  MULED_FILE_VIDEO_SRC_PREFIX,
  WIKI_VIDEO_SRC_PREFIX,
  exportWikiImageEmbedMarkdown,
  isMuledWikiVideoSrc,
} from '../../../lib/normalizeMarkdownWikiImages';
import {
  parseWikiVideoEmbedHtml,
} from '../../../lib/wikiVideoEmbed';
import { $isHtmlNode, type HtmlNode } from '../html/HtmlNode';
import { bindWysiwygDocumentRelativePathRef } from './wysiwygDocumentPathRef';
import {
  $createWikiVideoNode,
  $isWikiVideoNode,
  type WikiVideoNode,
} from './WikiVideoNode';

/** WYSIWYG 导入/导出：wiki 与工作区视频嵌入 */
export default function mdxEditorWikiVideoPlugin(
  documentRelativePathRef: RefObject<string | null | undefined>,
) {
  bindWysiwygDocumentRelativePathRef(documentRelativePathRef);

  const MDAST_WIKI_VIDEO_VISITOR: MdastImportVisitor<Image> = {
    priority: 60,
    testNode: (node) =>
      node.type === 'image' && isMuledWikiVideoSrc(node.url),
    visitNode({ mdastNode, actions }) {
      actions.addAndStepInto(
        $createWikiVideoNode({
          src: mdastNode.url,
          altText: mdastNode.alt ?? '',
        }),
      );
    },
  };

  const LEXICAL_WIKI_VIDEO_HTML_EXPORT_VISITOR: LexicalExportVisitor<
    HtmlNode,
    Text
  > = {
    priority: 60,
    testLexicalNode: (node) => {
      if (!$isHtmlNode(node)) {
        return false;
      }
      return parseWikiVideoEmbedHtml(node.getHtml()) !== null;
    },
    visitLexicalNode({ lexicalNode, mdastParent, actions }) {
      const parsed = parseWikiVideoEmbedHtml(lexicalNode.getHtml());
      if (!parsed) {
        return;
      }
      if (parsed.kind === 'wiki') {
        actions.appendToParent(mdastParent, {
          type: 'text',
          value: exportWikiImageEmbedMarkdown(parsed.path, ''),
        });
        return;
      }
      actions.appendToParent(mdastParent, {
        type: 'text',
        value: `![](${parsed.path})`,
      });
    },
  };

  const LEXICAL_WIKI_VIDEO_EXPORT_VISITOR: LexicalExportVisitor<
    WikiVideoNode,
    Text
  > = {
    priority: 50,
    testLexicalNode: (node) =>
      $isWikiVideoNode(node) && node.getSrc().startsWith(WIKI_VIDEO_SRC_PREFIX),
    visitLexicalNode({ lexicalNode, mdastParent, actions }) {
      const path = lexicalNode.getSrc().slice(WIKI_VIDEO_SRC_PREFIX.length);
      actions.appendToParent(mdastParent, {
        type: 'text',
        value: exportWikiImageEmbedMarkdown(path, lexicalNode.getAltText()),
      });
    },
  };

  const LEXICAL_FILE_VIDEO_EXPORT_VISITOR: LexicalExportVisitor<
    WikiVideoNode,
    Image
  > = {
    priority: 50,
    testLexicalNode: (node) =>
      $isWikiVideoNode(node) &&
      node.getSrc().startsWith(MULED_FILE_VIDEO_SRC_PREFIX),
    visitLexicalNode({ lexicalNode, mdastParent, actions }) {
      const path = lexicalNode
        .getSrc()
        .slice(MULED_FILE_VIDEO_SRC_PREFIX.length);
      actions.appendToParent(mdastParent, {
        type: 'image',
        url: path,
        alt: lexicalNode.getAltText(),
      });
    },
  };

  return realmPlugin({
    init(realm) {
      realm.pubIn({
        [addLexicalNode$]: WikiVideoNode,
        [addImportVisitor$]: MDAST_WIKI_VIDEO_VISITOR,
        [addExportVisitor$]: [
          LEXICAL_WIKI_VIDEO_HTML_EXPORT_VISITOR,
          LEXICAL_WIKI_VIDEO_EXPORT_VISITOR,
          LEXICAL_FILE_VIDEO_EXPORT_VISITOR,
        ],
      });
    },
  });
}
