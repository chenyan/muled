import { exportMarkdownFromWysiwyg } from './normalizeMarkdownWikiImages';
import {
  parseMnoteDocument,
  type MnoteDocument,
} from './mnoteFormat';
import { collapseMnoteEntriesFromWysiwyg } from './mnoteWysiwygTransform';

const FRONTMATTER_TABLE_RE =
  /^<table\b[^>]*\bdata-muled-frontmatter(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?[^>]*>[\s\S]*?<\/table>\s*/i;

const FRONTMATTER_RE = /^\ufeff?---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/;

function stripLeadingFrontmatter(source: string): string {
  return source
    .replace(FRONTMATTER_TABLE_RE, '')
    .replace(FRONTMATTER_RE, '')
    .trimStart();
}

function mnoteHeader(doc: MnoteDocument): string {
  return `---\nmuled:\n  kind: mnote\n  version: ${doc.version}\n  source: ${doc.source}\n---\n\n`;
}

/** 将 WYSIWYG 内容还原为规范的 .mnote 磁盘格式 */
export function exportMnoteFromWysiwyg(
  source: string,
  original?: string,
): string {
  const exported = exportMarkdownFromWysiwyg(source, original);
  const origDoc = original ? parseMnoteDocument(original) : parseMnoteDocument(exported);
  if (!origDoc) {
    return exported;
  }

  const body = collapseMnoteEntriesFromWysiwyg(stripLeadingFrontmatter(exported));
  return `${mnoteHeader(origDoc)}${body}${body ? '\n' : ''}`;
}
