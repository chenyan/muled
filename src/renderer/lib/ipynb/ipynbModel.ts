import type { IpynbCell, IpynbCellType, IpynbDocument, IpynbOutput } from '../../../shared/types/ipynb';
import {
  createEmptyNotebook,
  ensureCellIds,
  parseIpynbJson,
  serializeIpynb,
} from '../../../shared/ipynb/nbformat';
import { mergeStreamText, outputText } from './ipynbStreamText';

export function parseIpynbContent(content: string): IpynbDocument {
  return parseIpynbJson(content);
}

export function parseIpynbContentOrEmpty(content: string): IpynbDocument {
  try {
    return parseIpynbJson(content);
  } catch {
    return createEmptyNotebook();
  }
}

export function serializeIpynbContent(doc: IpynbDocument): string {
  ensureCellIds(doc);
  return serializeIpynb(doc);
}

export function updateCellSource(
  doc: IpynbDocument,
  cellId: string,
  source: string,
): IpynbDocument {
  return {
    ...doc,
    cells: doc.cells.map((cell) =>
      cell.id === cellId ? { ...cell, source } : cell,
    ),
  };
}

export function addCell(
  doc: IpynbDocument,
  afterIndex: number,
  cellType: IpynbCellType,
): IpynbDocument {
  const newCell = createCell(cellType);
  const cells = [...doc.cells];
  const insertAt = Math.min(Math.max(afterIndex + 1, 0), cells.length);
  cells.splice(insertAt, 0, newCell);
  return { ...doc, cells };
}

export function deleteCell(doc: IpynbDocument, cellId: string): IpynbDocument {
  if (doc.cells.length <= 1) {
    return {
      ...doc,
      cells: [createCell('code')],
    };
  }
  return {
    ...doc,
    cells: doc.cells.filter((cell) => cell.id !== cellId),
  };
}

export function moveCell(
  doc: IpynbDocument,
  cellId: string,
  direction: 'up' | 'down',
): IpynbDocument {
  const index = doc.cells.findIndex((cell) => cell.id === cellId);
  if (index < 0) return doc;
  const target = direction === 'up' ? index - 1 : index + 1;
  if (target < 0 || target >= doc.cells.length) return doc;
  const cells = [...doc.cells];
  const [item] = cells.splice(index, 1);
  cells.splice(target, 0, item);
  return { ...doc, cells };
}

export function changeCellType(
  doc: IpynbDocument,
  cellId: string,
  cellType: IpynbCellType,
): IpynbDocument {
  return {
    ...doc,
    cells: doc.cells.map((cell) => {
      if (cell.id !== cellId || cell.cell_type === cellType) return cell;
      return normalizeCellType(cell, cellType);
    }),
  };
}

function createCell(cellType: IpynbCellType): IpynbCell {
  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `cell-${Date.now()}`;
  if (cellType === 'code') {
    return {
      id,
      cell_type: 'code',
      source: '',
      metadata: {},
      outputs: [],
      execution_count: null,
    };
  }
  return {
    id,
    cell_type: cellType,
    source: '',
    metadata: {},
  };
}

export function applyCellExecutionResult(
  doc: IpynbDocument,
  cellId: string,
  executionCount: number,
  outputs: IpynbCell['outputs'],
): IpynbDocument {
  return {
    ...doc,
    cells: doc.cells.map((cell) =>
      cell.id === cellId
        ? {
            ...cell,
            execution_count: executionCount,
            outputs: outputs ?? [],
          }
        : cell,
    ),
  };
}

/** 执行结束时合并流式输出与最终 display/error 等 */
export function finalizeCellExecution(
  doc: IpynbDocument,
  cellId: string,
  executionCount: number,
  trailingOutputs: IpynbOutput[],
  liveOutputs: IpynbOutput[] = [],
): IpynbDocument {
  const streams = liveOutputs.filter((o) => o.output_type === 'stream');
  const liveRich = liveOutputs.filter((o) => o.output_type !== 'stream');
  return {
    ...doc,
    cells: doc.cells.map((cell) => {
      if (cell.id !== cellId) return cell;
      return {
        ...cell,
        execution_count: executionCount,
        outputs: [...streams, ...liveRich, ...trailingOutputs],
      };
    }),
  };
}

export function appendOutputToList(
  outputs: IpynbOutput[],
  output: IpynbOutput,
): IpynbOutput[] {
  if (output.output_type === 'stream') {
    const name = output.name === 'stderr' ? 'stderr' : 'stdout';
    const chunk = outputText(output.text);
    if (!chunk) return outputs;
    const last = outputs[outputs.length - 1];
    if (
      last?.output_type === 'stream' &&
      (last.name ?? 'stdout') === name
    ) {
      return [
        ...outputs.slice(0, -1),
        {
          ...last,
          name,
          text: mergeStreamText(outputText(last.text), chunk),
        },
      ];
    }
    return [...outputs, { output_type: 'stream', name, text: chunk }];
  }
  return [...outputs, output];
}

export function appendCellStreamChunk(
  doc: IpynbDocument,
  cellId: string,
  name: 'stdout' | 'stderr',
  chunk: string,
): IpynbDocument {
  if (!chunk) return doc;
  return {
    ...doc,
    cells: doc.cells.map((cell) => {
      if (cell.id !== cellId) return cell;
      return {
        ...cell,
        outputs: appendOutputToList(cell.outputs ?? [], {
          output_type: 'stream',
          name,
          text: chunk,
        }),
      };
    }),
  };
}

export function appendCellOutput(
  doc: IpynbDocument,
  cellId: string,
  output: IpynbOutput,
): IpynbDocument {
  return {
    ...doc,
    cells: doc.cells.map((cell) =>
      cell.id === cellId
        ? { ...cell, outputs: appendOutputToList(cell.outputs ?? [], output) }
        : cell,
    ),
  };
}

export function clearCellOutputs(
  doc: IpynbDocument,
  cellId: string,
): IpynbDocument {
  return {
    ...doc,
    cells: doc.cells.map((cell) =>
      cell.id === cellId ? { ...cell, outputs: [] } : cell,
    ),
  };
}

function normalizeCellType(cell: IpynbCell, cellType: IpynbCellType): IpynbCell {
  const base: IpynbCell = {
    id: cell.id,
    cell_type: cellType,
    source: cell.source,
    metadata: { ...cell.metadata },
  };
  if (cellType === 'code') {
    return {
      ...base,
      outputs: cell.outputs ?? [],
      execution_count: cell.execution_count ?? null,
    };
  }
  return base;
}
