import {
  formatBlockquote,
  isMetaOnlyMnoteInterior,
  parseEntryTail,
  parseMnoteEntryBlock,
  parseMnoteEntryMeta,
  serializeMnoteEntryMeta,
} from './mnoteFormat';

const ENTRY_FENCE_RE = /```mnote-entry\r?\n([\s\S]*?)```/g;

function trimLegacyEntryTail(tail: string): string {
  return tail.replace(/^\s*(?:---\s*)?/, '').replace(/\s*---\s*$/, '').trim();
}

/** 磁盘格式（quote/body 在 fence 内）→ WYSIWYG 可编辑格式（meta fence + 外部 markdown） */
export function expandMnoteEntriesForWysiwyg(body: string): string {
  return body.replace(/```mnote-entry\r?\n([\s\S]*?)```/g, (full, interior: string) => {
    if (isMetaOnlyMnoteInterior(interior)) {
      return full;
    }
    const { meta, quote, body: entryBody } = parseMnoteEntryBlock(interior);
    if (!meta) return full;

    const parts = [serializeMnoteEntryMeta(meta)];
    if (quote?.trim()) {
      parts.push('', formatBlockquote(quote.trim()));
    }
    if (entryBody?.trim()) {
      parts.push('', entryBody.trim());
    }
    return parts.join('\n');
  });
}

/** WYSIWYG 格式 → 磁盘格式（每条笔记完整包在 mnote-entry fence 内） */
export function collapseMnoteEntriesFromWysiwyg(body: string): string {
  const blocks: { start: number; end: number; interior: string }[] = [];
  ENTRY_FENCE_RE.lastIndex = 0;
  let match: RegExpExecArray | null = null;
  while ((match = ENTRY_FENCE_RE.exec(body)) !== null) {
    blocks.push({
      start: match.index,
      end: match.index + match[0].length,
      interior: match[1]!,
    });
  }

  if (blocks.length === 0) {
    return body;
  }

  let result = body;
  for (let i = blocks.length - 1; i >= 0; i -= 1) {
    const current = blocks[i]!;
    if (!isMetaOnlyMnoteInterior(current.interior)) {
      continue;
    }

    const meta = parseMnoteEntryMeta(current.interior);
    if (!meta) continue;

    const nextStart = blocks[i + 1]?.start ?? body.length;
    const tail = trimLegacyEntryTail(body.slice(current.end, nextStart));
    const { quote, body: entryBody } = parseEntryTail(tail);

    const parts = [`id: ${meta.id}`, `loc: ${meta.loc}`];
    if (meta.created) parts.push(`created: ${meta.created}`);
    if (meta.label?.trim()) parts.push(`label: ${meta.label.trim()}`);
    if (meta.sync) parts.push(`sync: ${meta.sync}`);

    if (quote?.trim()) {
      parts.push('', formatBlockquote(quote.trim()));
    }
    if (entryBody?.trim()) {
      parts.push('', entryBody.trim());
    }

    const collapsed = `\`\`\`mnote-entry\n${parts.join('\n')}\n\`\`\``;
    const replaceEnd = tail ? nextStart : current.end;
    result = `${result.slice(0, current.start)}${collapsed}${result.slice(replaceEnd)}`;
  }

  return result;
}
