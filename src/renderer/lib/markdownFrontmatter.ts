import yaml from 'js-yaml';

const FRONTMATTER_RE = /^\ufeff?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

const FRONTMATTER_TABLE_RE =
  /^<table\b[^>]*\bdata-muled-frontmatter(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?[^>]*>[\s\S]*?<\/table>\s*/i;

const FRONTMATTER_TABLE_BODY_RE =
  /<tbody\b[^>]*>([\s\S]*?)<\/tbody>/i;

const FRONTMATTER_TABLE_ROW_RE =
  /<tr\b[^>]*>\s*<td\b[^>]*>([\s\S]*?)<\/td>\s*<td\b[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi;

function escapeHtmlText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function unescapeHtmlText(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
}

function stripHtmlTags(value: string): string {
  return value.replace(/<[^>]+>/g, '');
}

export function splitObsidianFrontmatter(
  source: string,
): { yaml: string; body: string } | null {
  const match = source.match(FRONTMATTER_RE);
  if (!match) {
    return null;
  }
  return {
    yaml: match[1],
    body: source.slice(match[0].length),
  };
}

function formatFrontmatterValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => formatFrontmatterValue(item)).join(', ');
  }
  return yaml.dump(value, { lineWidth: -1, noRefs: true }).trim();
}

function parseFrontmatterRecord(yamlSource: string): Record<string, unknown> | null {
  const trimmed = yamlSource.trim();
  if (!trimmed) {
    return {};
  }
  try {
    const loaded = yaml.load(trimmed);
    if (!loaded || typeof loaded !== 'object' || Array.isArray(loaded)) {
      return null;
    }
    return loaded as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function frontmatterYamlToHtmlTable(yamlSource: string): string | null {
  const record = parseFrontmatterRecord(yamlSource);
  if (record === null) {
    return null;
  }

  const rows = Object.entries(record)
    .map(
      ([key, value]) =>
        `<tr><td>${escapeHtmlText(key)}</td><td>${escapeHtmlText(formatFrontmatterValue(value))}</td></tr>`,
    )
    .join('');

  return [
    '<table class="MuledFrontmatterTable" data-muled-frontmatter>',
    `<tbody>${rows}</tbody>`,
    '</table>',
  ].join('');
}

function parseCellToYamlValue(cell: string): unknown {
  const trimmed = stripHtmlTags(unescapeHtmlText(cell)).trim();
  if (trimmed === '') {
    return '';
  }
  if (trimmed === 'true') {
    return true;
  }
  if (trimmed === 'false') {
    return false;
  }
  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
    const num = Number(trimmed);
    if (!Number.isNaN(num)) {
      return num;
    }
  }
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const loaded = yaml.load(trimmed);
      if (loaded !== undefined) {
        return loaded;
      }
    } catch {
      // fall through to plain string
    }
  }
  return trimmed;
}

export function frontmatterHtmlTableToYaml(tableHtml: string): string | null {
  const bodyMatch = tableHtml.match(FRONTMATTER_TABLE_BODY_RE);
  if (!bodyMatch) {
    return null;
  }

  const record: Record<string, unknown> = {};
  for (const match of bodyMatch[1].matchAll(FRONTMATTER_TABLE_ROW_RE)) {
    const key = stripHtmlTags(unescapeHtmlText(match[1])).trim();
    if (!key) {
      continue;
    }
    record[key] = parseCellToYamlValue(match[2]);
  }

  return yaml.dump(record, { lineWidth: -1, noRefs: true });
}

/** WYSIWYG 载入：文档开头的 Obsidian frontmatter → HTML 表格 */
export function normalizeMarkdownFrontmatterForWysiwyg(source: string): string {
  const split = splitObsidianFrontmatter(source);
  if (!split) {
    return source;
  }

  const tableHtml = frontmatterYamlToHtmlTable(split.yaml);
  if (!tableHtml) {
    return source;
  }

  if (!split.body) {
    return tableHtml;
  }
  return `${tableHtml}\n\n${split.body.replace(/^\n+/, '')}`;
}

/** WYSIWYG 导出：HTML 表格 → Obsidian frontmatter */
export function exportFrontmatterFromWysiwyg(source: string): string {
  const match = source.match(FRONTMATTER_TABLE_RE);
  if (!match) {
    return source;
  }

  const yamlBlock = frontmatterHtmlTableToYaml(match[0]);
  if (yamlBlock === null) {
    return source;
  }

  const rest = source.slice(match[0].length).replace(/^\n+/, '');
  if (!rest) {
    return `---\n${yamlBlock}---\n`;
  }
  return `---\n${yamlBlock}---\n\n${rest}`;
}
