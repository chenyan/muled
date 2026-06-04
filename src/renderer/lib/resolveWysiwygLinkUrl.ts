import { $isLinkNode } from '@lexical/link';
import { $findMatchingParent } from '@lexical/utils';
import { $getNearestNodeFromDOMNode, type LexicalEditor } from 'lexical';
import {
  WIKI_LINK_LEGACY_PREFIX,
  WIKI_LINK_SRC_PREFIX,
} from './normalizeMarkdownWikiLinks';
import { getWysiwygContentRoot } from './wysiwygContentRoot';

type LexicalRootElement = HTMLElement & {
  __lexicalEditor?: LexicalEditor;
};

const WIKI_TEXT_RE = /\[\[([^\]]+)\]\]/;

function wikiTitleFromRaw(raw: string): string {
  const trimmed = raw.trim();
  const pipeIndex = trimmed.indexOf('|');
  if (pipeIndex === -1) {
    return trimmed;
  }
  return trimmed.slice(0, pipeIndex).trim();
}

function wikiTitleFromPlainText(target: Node, boundary: HTMLElement): string | null {
  let node: Node | null = target;
  while (node && node !== boundary) {
    if (node instanceof Text) {
      const match = WIKI_TEXT_RE.exec(node.textContent ?? '');
      if (match) {
        return wikiTitleFromRaw(match[1]);
      }
    }
    if (node instanceof Element) {
      const match = WIKI_TEXT_RE.exec(node.textContent ?? '');
      if (match && node.closest('a') === null) {
        return wikiTitleFromRaw(match[1]);
      }
    }
    node = node.parentNode;
  }
  return null;
}

function normalizeLinkHref(href: string): string {
  const trimmed = href.trim();
  if (
    trimmed.startsWith(WIKI_LINK_SRC_PREFIX) ||
    trimmed.startsWith(WIKI_LINK_LEGACY_PREFIX) ||
    /^https?:\/\//i.test(trimmed) ||
    trimmed.startsWith('mailto:')
  ) {
    return trimmed;
  }

  const hashIndex = trimmed.indexOf('#');
  if (hashIndex >= 0) {
    const hash = trimmed.slice(hashIndex);
    if (
      hash.startsWith(WIKI_LINK_SRC_PREFIX) ||
      hash.startsWith(WIKI_LINK_LEGACY_PREFIX)
    ) {
      return hash;
    }
  }

  return trimmed;
}

function resolveFromDomAnchor(target: Node): string | null {
  if (!(target instanceof Element)) {
    return null;
  }
  const anchor = target.closest('a');
  if (!anchor) {
    return null;
  }
  const attrHref = anchor.getAttribute('href');
  if (attrHref && attrHref !== 'about:blank') {
    return normalizeLinkHref(attrHref);
  }
  if (anchor.href) {
    return normalizeLinkHref(anchor.href);
  }
  return null;
}

function resolveFromLexicalEditor(
  editor: LexicalEditor,
  target: Node,
): string | null {
  let linkUrl: string | null = null;
  // $getNearestNodeFromDOMNode 依赖 active editor，必须用 editor.read() 而非 getEditorState().read()
  editor.read(() => {
    const nearestNode = $getNearestNodeFromDOMNode(target);
    if (!nearestNode) {
      return;
    }
    const linkNode = $findMatchingParent(nearestNode, $isLinkNode);
    if (linkNode) {
      linkUrl = linkNode.getURL();
    }
  });
  return linkUrl ? normalizeLinkHref(linkUrl) : null;
}

export function resolveWysiwygLinkUrl(
  target: EventTarget | null,
  host: HTMLElement,
): string | null {
  if (!(target instanceof Node) || !host.contains(target)) {
    return null;
  }

  const domUrl = resolveFromDomAnchor(target);
  if (domUrl) {
    return domUrl;
  }

  const editorRoot = getWysiwygContentRoot(host) as LexicalRootElement | null;
  const editor = editorRoot?.__lexicalEditor;

  if (editor) {
    const lexicalUrl = resolveFromLexicalEditor(editor, target);
    if (lexicalUrl) {
      return lexicalUrl;
    }
  }

  if (editorRoot) {
    const wikiTitle = wikiTitleFromPlainText(target, editorRoot);
    if (wikiTitle) {
      return `${WIKI_LINK_SRC_PREFIX}${encodeURIComponent(wikiTitle)}`;
    }
  }

  return null;
}
