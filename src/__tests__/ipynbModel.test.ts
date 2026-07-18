import {
  applyCellExecutionResult,
  clearCellOutputs,
} from '../renderer/lib/ipynb/ipynbModel';
import { createEmptyNotebook } from '../shared/ipynb/nbformat';

describe('ipynbModel execution helpers', () => {
  it('applies execution outputs to a code cell', () => {
    const doc = createEmptyNotebook('python');
    const cellId = doc.cells[0].id!;
    const next = applyCellExecutionResult(doc, cellId, 1, [
      { output_type: 'stream', name: 'stdout', text: 'hello\n' },
    ]);
    expect(next.cells[0].execution_count).toBe(1);
    expect(next.cells[0].outputs).toHaveLength(1);
  });

  it('clears cell outputs before rerun', () => {
    const doc = createEmptyNotebook('python');
    const cellId = doc.cells[0].id!;
    const withOutput = applyCellExecutionResult(doc, cellId, 1, [
      { output_type: 'stream', name: 'stdout', text: 'old\n' },
    ]);
    const cleared = clearCellOutputs(withOutput, cellId);
    expect(cleared.cells[0].outputs).toEqual([]);
  });

  it('keeps completed cell outputs when starting the next run-all cell', () => {
    const doc = createEmptyNotebook('python');
    const firstId = doc.cells[0].id!;
    const secondId = 'cell-second';
    const twoCells = {
      ...doc,
      cells: [
        doc.cells[0],
        {
          id: secondId,
          cell_type: 'code' as const,
          source: 'print(2)',
          metadata: {},
          outputs: [],
          execution_count: null,
        },
      ],
    };
    const afterFirst = applyCellExecutionResult(twoCells, firstId, 1, [
      { output_type: 'stream', name: 'stdout', text: '1\n' },
    ]);
    const startingSecond = clearCellOutputs(afterFirst, secondId);
    expect(startingSecond.cells[0].outputs).toHaveLength(1);
    expect(startingSecond.cells[1].outputs).toEqual([]);
  });
});
