import {
  appendCellStreamChunk,
  finalizeCellExecution,
} from '../renderer/lib/ipynb/ipynbModel';
import { mergeStreamText } from '../renderer/lib/ipynb/ipynbStreamText';
import { createEmptyNotebook } from '../shared/ipynb/nbformat';
import type { IpynbOutput } from '../shared/types/ipynb';

describe('ipynbStreamText', () => {
  it('merges carriage return for tqdm-style updates', () => {
    expect(mergeStreamText('line1\n', '\r50%')).toBe('line1\n50%');
    expect(mergeStreamText('hello', '\rworld')).toBe('world');
  });
});

describe('ipynbModel streaming', () => {
  it('appends stream chunks into one stdout output', () => {
    const doc = createEmptyNotebook('python');
    const cellId = doc.cells[0].id!;
    const once = appendCellStreamChunk(doc, cellId, 'stdout', 'a');
    const twice = appendCellStreamChunk(once, cellId, 'stdout', 'b');
    expect(twice.cells[0].outputs).toEqual([
      { output_type: 'stream', name: 'stdout', text: 'ab' },
    ]);
  });

  it('finalize keeps streamed stdout and adds trailing outputs', () => {
    const doc = createEmptyNotebook('python');
    const cellId = doc.cells[0].id!;
    const live: IpynbOutput[] = [
      { output_type: 'stream', name: 'stderr', text: 'progress\n' },
    ];
    const final = finalizeCellExecution(doc, cellId, 2, [
      {
        output_type: 'execute_result',
        data: { 'text/plain': '42' },
        metadata: {},
        execution_count: 2,
      },
    ], live);
    expect(final.cells[0].outputs).toHaveLength(2);
    expect(final.cells[0].outputs?.[0]).toMatchObject({
      output_type: 'stream',
      name: 'stderr',
    });
    expect(final.cells[0].execution_count).toBe(2);
  });
});
