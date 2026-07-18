import type {
  IpynbCell,
  IpynbCellType,
  IpynbDocument,
  IpynbMetadata,
  IpynbOutput,
} from '../types/ipynb';

export class IpynbParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IpynbParseError';
  }
}

function newCellId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `cell-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function normalizeCellSource(source: unknown): string {
  if (typeof source === 'string') return source;
  if (Array.isArray(source)) {
    return source
      .map((line) => (typeof line === 'string' ? line : String(line)))
      .join('');
  }
  return '';
}

export function denormalizeCellSource(source: string): string[] {
  if (!source) return [];
  const lines = source.split('\n');
  return lines.map((line, index) =>
    index < lines.length - 1 ? `${line}\n` : line,
  );
}

function parseCellType(value: unknown): IpynbCellType {
  if (value === 'code' || value === 'markdown' || value === 'raw') {
    return value;
  }
  return 'code';
}

function parseOutputs(value: unknown): IpynbOutput[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value as IpynbOutput[];
}

function parseCell(raw: unknown): IpynbCell {
  if (!raw || typeof raw !== 'object') {
    throw new IpynbParseError('无效的 cell 对象');
  }
  const obj = raw as Record<string, unknown>;
  const cellType = parseCellType(obj.cell_type);
  const cell: IpynbCell = {
    id: typeof obj.id === 'string' ? obj.id : undefined,
    cell_type: cellType,
    source: normalizeCellSource(obj.source),
    metadata:
      obj.metadata && typeof obj.metadata === 'object'
        ? { ...(obj.metadata as Record<string, unknown>) }
        : {},
  };
  if (cellType === 'code') {
    cell.outputs = parseOutputs(obj.outputs) ?? [];
    const count = obj.execution_count;
    cell.execution_count =
      typeof count === 'number' || count === null ? count : null;
  }
  return cell;
}

function detectIndentAmount(raw: string): string {
  const match = raw.match(/\n([ \t]+)"/);
  if (!match) return ' ';
  return match[1].includes('\t') ? '\t' : ' ';
}

function preferredLanguage(metadata: IpynbMetadata): string {
  return (
    metadata.kernelspec?.language ??
    metadata.language_info?.name ??
    'python'
  );
}

export function ensureCellIds(doc: IpynbDocument): void {
  for (const cell of doc.cells) {
    if (!cell.id) {
      cell.id = newCellId();
    }
  }
}

export function createEmptyNotebook(language = 'python'): IpynbDocument {
  return {
    nbformat: 4,
    nbformat_minor: 5,
    metadata: {
      kernelspec: {
        display_name: language === 'python' ? 'Python 3' : language,
        language,
        name: language === 'python' ? 'python3' : `${language}_kernel`,
      },
      language_info: {
        name: language,
      },
    },
    cells: [
      {
        id: newCellId(),
        cell_type: 'code',
        source: '',
        metadata: {},
        outputs: [],
        execution_count: null,
      },
    ],
  };
}

export function parseIpynbJson(raw: string): IpynbDocument {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new IpynbParseError('无效的 Jupyter Notebook JSON');
  }

  if (!json || typeof json !== 'object') {
    throw new IpynbParseError('Notebook 根对象无效');
  }

  const root = json as Record<string, unknown>;
  const cellsRaw = root.cells;
  if (!Array.isArray(cellsRaw)) {
    throw new IpynbParseError('缺少 cells 数组');
  }

  const metadata: IpynbMetadata =
    root.metadata && typeof root.metadata === 'object'
      ? { ...(root.metadata as IpynbMetadata) }
      : {};

  const doc: IpynbDocument = {
    nbformat: typeof root.nbformat === 'number' ? root.nbformat : 4,
    nbformat_minor:
      typeof root.nbformat_minor === 'number' ? root.nbformat_minor : 5,
    metadata,
    cells: cellsRaw.map(parseCell),
  };

  if (doc.cells.length === 0) {
    const lang = preferredLanguage(metadata);
    doc.cells.push({
      id: newCellId(),
      cell_type: 'code',
      source: '',
      metadata: {},
      outputs: [],
      execution_count: null,
    });
    if (!doc.metadata.language_info) {
      doc.metadata.language_info = { name: lang };
    }
  }

  if (!metadata.kernelspec && !metadata.language_info) {
    const lang = preferredLanguage(metadata);
    doc.metadata.language_info = { name: lang };
  }

  doc.metadata.indentAmount = detectIndentAmount(raw);
  ensureCellIds(doc);
  return doc;
}

function serializeCell(cell: IpynbCell): Record<string, unknown> {
  const base: Record<string, unknown> = {
    id: cell.id,
    cell_type: cell.cell_type,
    metadata: cell.metadata,
    source: denormalizeCellSource(cell.source),
  };
  if (cell.cell_type === 'code') {
    base.outputs = cell.outputs ?? [];
    base.execution_count = cell.execution_count ?? null;
  }
  return base;
}

export function serializeIpynb(doc: IpynbDocument): string {
  const indent = doc.metadata.indentAmount ?? ' ';
  const payload = {
    nbformat: doc.nbformat,
    nbformat_minor: doc.nbformat_minor,
    metadata: { ...doc.metadata },
    cells: doc.cells.map(serializeCell),
  };
  delete (payload.metadata as IpynbMetadata).indentAmount;
  return JSON.stringify(payload, null, indent === '\t' ? '\t' : 1);
}

export function getNotebookLanguage(doc: IpynbDocument): string {
  return preferredLanguage(doc.metadata);
}
