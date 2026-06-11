import { pdfBufferFromBytes } from '../renderer/lib/pdfBuffer';

describe('pdfBufferFromBytes', () => {
  it('returns the same buffer when view covers entire allocation', () => {
    const source = new Uint8Array([1, 2, 3, 4]);
    expect(pdfBufferFromBytes(source)).toBe(source.buffer);
  });

  it('slices when view is offset inside a larger buffer', () => {
    const backing = new Uint8Array([9, 9, 1, 2, 3, 9]);
    const view = backing.subarray(2, 5);
    const result = pdfBufferFromBytes(view);
    expect(result).not.toBe(backing.buffer);
    expect(new Uint8Array(result)).toEqual(new Uint8Array([1, 2, 3]));
  });
});
