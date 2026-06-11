import { splitObsidianFrontmatter } from './markdownFrontmatter';

export interface MnoteEntryMeta {
  id: string;
  loc: string;
  created?: string;
  label?: string;
  sync?: 'primary' | 'auto';
}

export interface MnoteEntry extends MnoteEntryMeta {
  quote?: string;
  body: string;
}

export interface MnoteDocument {
  kind: 'mnote';
  version: 1;
  source: string;
  entries: MnoteEntry[];
}

const ENTRY_FENCE_RE = /```mnote-entry\r?\n([\s\S]*?)```/g;

export function parseMnoteEntryMeta(raw: string): MnoteEntryMeta | null {
  const lines = raw.trim().split(/\r?\n/);
  const meta: Record<string, string> = {};
  for (const line of lines) {
    const colon = line.indexOf(':');
    if (colon < 0) continue;
    const key = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();
    if (key && value) meta[key] = value;
  }
  if (!meta.id || !meta.loc) return null;
  return {
    id: meta.id,
    loc: meta.loc,
    created: meta.created,
    label: meta.label,
    sync: meta.sync === 'primary' ? 'primary' : meta.sync === 'auto' ? 'auto' : undefined,
  };
}

function parseEntryTail(tail: string): { quote?: string; body: string } {
  const trimmed = tail.replace(/^\r?\n/, '');
  if (!trimmed) return { body: '' };

  const lines = trimmed.split(/\r?\n/);
  const quoteLines: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index]!;
    if (line.startsWith('>')) {
      quoteLines.push(line.replace(/^>\s?/, ''));
      index += 1;
      continue;
    }
    if (quoteLines.length > 0 && line.trim() === '') {
      index += 1;
      break;
    }
    if (quoteLines.length > 0) break;
    break;
  }

  const body = lines.slice(index).join('\n').trim();
  const quote = quoteLines.length > 0 ? quoteLines.join('\n') : undefined;
  return { quote, body };
}

export function parseMnoteDocument(content: string): MnoteDocument | null {
  const split = splitObsidianFrontmatter(content);
  if (!split) return null;

  let parsed: Record<string, unknown> | null = null;
  try {
    const yaml = awaitableYamlLoad(split.yaml);
    parsed = yaml;
  } catch {
    return null;
  }

  const muled = parsed?.muled;
  if (!muled || typeof muled !== 'object' || Array.isArray(muled)) {
    return null;
  }
  const record = muled as Record<string, unknown>;
  if (record.kind !== 'mnote') return null;
  const source = typeof record.source === 'string' ? record.source : null;
  if (!source) return null;

  const entries: MnoteEntry[] = [];
  const body = split.body;
  const blocks: { meta: string; start: number; end: number }[] = [];
  let match: RegExpExecArray | null = null;
  ENTRY_FENCE_RE.lastIndex = 0;
  while ((match = ENTRY_FENCE_RE.exec(body)) !== null) {
    blocks.push({
      meta: match[1]!,
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  for (let i = 0; i < blocks.length; i += 1) {
    const current = blocks[i]!;
    const nextStart = blocks[i + 1]?.start ?? body.length;
    let tail = body.slice(current.end, nextStart);
    tail = tail.replace(/^\s*(?:---\s*)?/, '').replace(/\s*---\s*$/, '');

    const meta = parseMnoteEntryMeta(current.meta);
    if (!meta) continue;

    const { quote, body: entryBody } = parseEntryTail(tail);
    entries.push({ ...meta, quote, body: entryBody });
  }

  return {
    kind: 'mnote',
    version: 1,
    source,
    entries,
  };
}

function awaitableYamlLoad(yamlSource: string): Record<string, unknown> {
  // 轻量解析 muled frontmatter，避免在 renderer 侧重复引入复杂逻辑
  const lines = yamlSource.split(/\r?\n/);
  const root: Record<string, unknown> = {};
  let current: Record<string, unknown> | null = null;
  let indent = 0;

  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const leading = line.match(/^(\s*)/)?.[1]?.length ?? 0;
    const trimmed = line.trim();

    if (leading === 0) {
      const colon = trimmed.indexOf(':');
      if (colon < 0) continue;
      const key = trimmed.slice(0, colon).trim();
      const value = trimmed.slice(colon + 1).trim();
      if (!value) {
        current = {};
        root[key] = current;
        indent = 0;
      } else {
        root[key] = parseYamlScalar(value);
        current = null;
      }
      continue;
    }

    if (current && leading > indent) {
      const colon = trimmed.indexOf(':');
      if (colon < 0) continue;
      const key = trimmed.slice(0, colon).trim();
      const value = trimmed.slice(colon + 1).trim();
      current[key] = parseYamlScalar(value);
    }
  }

  return root;
}

function parseYamlScalar(value: string): string | number {
  if (/^\d+$/.test(value)) return Number(value);
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

export function createMnoteDocument(sourcePath: string): string {
  return `---\nmuled:\n  kind: mnote\n  version: 1\n  source: ${sourcePath}\n---\n\n`;
}

export function formatBlockquote(text: string): string {
  return text
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n');
}

export function serializeMnoteEntry(entry: {
  id: string;
  loc: string;
  created?: string;
  label?: string;
  sync?: 'primary' | 'auto';
  quote?: string;
  body?: string;
}): string {
  const metaLines = ['```mnote-entry', `id: ${entry.id}`, `loc: ${entry.loc}`];
  if (entry.created) metaLines.push(`created: ${entry.created}`);
  if (entry.label?.trim()) metaLines.push(`label: ${entry.label.trim()}`);
  if (entry.sync) metaLines.push(`sync: ${entry.sync}`);
  metaLines.push('```');

  const chunks = [metaLines.join('\n')];
  if (entry.quote?.trim()) {
    chunks.push('', formatBlockquote(entry.quote.trim()));
  }
  if (entry.body?.trim()) {
    chunks.push('', entry.body.trim());
  }
  return chunks.join('\n');
}

export function appendMnoteEntryToContent(
  content: string,
  entry: Parameters<typeof serializeMnoteEntry>[0],
): string {
  const block = serializeMnoteEntry(entry);
  const trimmed = content.trimEnd();
  if (!trimmed) {
    return `${block}\n`;
  }
  return `${trimmed}\n\n---\n\n${block}\n`;
}

export function generateMnoteEntryId(existingContent: string, now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const prefix = `${y}${m}${d}`;
  const re = new RegExp(`id:\\s*${prefix}-(\\d+)`, 'g');
  let max = 0;
  for (const match of existingContent.matchAll(re)) {
    max = Math.max(max, Number(match[1]));
  }
  return `${prefix}-${String(max + 1).padStart(3, '0')}`;
}

export function linesFromCharRange(
  content: string,
  from: number,
  to: number,
): { start: number; end: number } {
  const start = content.slice(0, from).split('\n').length;
  const selected = content.slice(from, to);
  const lineCount = selected.length === 0 ? 0 : selected.split('\n').length;
  const end = start + Math.max(0, lineCount - 1);
  return { start, end: Math.max(start, end) };
}

export function serializeMnoteDocument(doc: MnoteDocument): string {
  const header = `---\nmuled:\n  kind: mnote\n  version: ${doc.version}\n  source: ${doc.source}\n---\n\n`;
  if (doc.entries.length === 0) {
    return header;
  }
  return `${header}${doc.entries.map((entry) => serializeMnoteEntry(entry)).join('\n\n---\n\n')}\n`;
}

export function formatMarkdownMnoteLoc(lines: { start: number; end: number }): string {
  if (lines.start === lines.end) {
    return `lines=${lines.start}`;
  }
  return `lines=${lines.start}-${lines.end}`;
}
