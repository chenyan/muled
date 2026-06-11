import { exportMarkdownFromWysiwyg } from './normalizeMarkdownWikiImages';
import {
  parseMnoteDocument,
  serializeMnoteDocument,
  type MnoteDocument,
} from './mnoteFormat';

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
  const direct = parseMnoteDocument(exported);
  if (direct) {
    return serializeMnoteDocument(direct);
  }

  const origDoc = original ? parseMnoteDocument(original) : null;
  if (!origDoc) {
    return exported;
  }

  // frontmatter 表格往返会把嵌套 muled 压成字符串，保留原始 header 再解析正文
  const body = stripLeadingFrontmatter(exported);
  const recomposed = `${mnoteHeader(origDoc)}${body}${body ? '\n' : ''}`;
  const doc = parseMnoteDocument(recomposed);
  if (!doc) {
    return exported;
  }
  return serializeMnoteDocument({
    ...origDoc,
    entries: doc.entries,
  });
}
