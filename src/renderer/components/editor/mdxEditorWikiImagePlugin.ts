import {
  $isImageNode,
  addExportVisitor$,
  realmPlugin,
  type ImageNode,
  type LexicalExportVisitor,
} from '@mdxeditor/editor';
import type { RefObject } from 'react';
import type { Image, Text } from 'mdast';
import {
  MULED_FILE_SRC_PREFIX,
  WIKI_IMAGE_SRC_PREFIX,
  exportWikiImageEmbedMarkdown,
} from '../../lib/normalizeMarkdownWikiImages';

/** WYSIWYG 导出：内部前缀 → 磁盘上的 ![[...]] / ![](...) */
export default function mdxEditorWikiImagePlugin(
  _documentRelativePathRef: RefObject<string | null | undefined>,
) {
  const LEXICAL_WIKI_IMAGE_EXPORT_VISITOR: LexicalExportVisitor<
    ImageNode,
    Text
  > = {
    priority: 50,
    testLexicalNode: (node) =>
      $isImageNode(node) && node.getSrc().startsWith(WIKI_IMAGE_SRC_PREFIX),
    visitLexicalNode({ lexicalNode, mdastParent, actions }) {
      const path = lexicalNode.getSrc().slice(WIKI_IMAGE_SRC_PREFIX.length);
      actions.appendToParent(mdastParent, {
        type: 'text',
        value: exportWikiImageEmbedMarkdown(path, lexicalNode.getAltText()),
      });
    },
  };

  const LEXICAL_FILE_IMAGE_EXPORT_VISITOR: LexicalExportVisitor<
    ImageNode,
    Image
  > = {
    priority: 50,
    testLexicalNode: (node) =>
      $isImageNode(node) && node.getSrc().startsWith(MULED_FILE_SRC_PREFIX),
    visitLexicalNode({ lexicalNode, mdastParent, actions }) {
      const path = lexicalNode.getSrc().slice(MULED_FILE_SRC_PREFIX.length);
      actions.appendToParent(mdastParent, {
        type: 'image',
        url: path,
        alt: lexicalNode.getAltText(),
        title: lexicalNode.getTitle(),
      });
    },
  };

  return realmPlugin({
    init(realm) {
      realm.pubIn({
        [addExportVisitor$]: [
          LEXICAL_WIKI_IMAGE_EXPORT_VISITOR,
          LEXICAL_FILE_IMAGE_EXPORT_VISITOR,
        ],
      });
    },
  });
}
