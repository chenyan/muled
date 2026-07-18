/** Build line-start offsets for 1-based line/column lookup. */
export function buildLineStarts(content: string): number[] {
  const starts = [0];
  for (let i = 0; i < content.length; i += 1) {
    if (content[i] === '\n') starts.push(i + 1);
  }
  return starts;
}

export function offsetToLineCol(
  lineStarts: number[],
  offset: number,
): { line: number; column: number } {
  let lo = 0;
  let hi = lineStarts.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const start = lineStarts[mid]!;
    const next = lineStarts[mid + 1] ?? Number.POSITIVE_INFINITY;
    if (offset < start) {
      hi = mid - 1;
    } else if (offset >= next) {
      lo = mid + 1;
    } else {
      return { line: mid + 1, column: offset - start + 1 };
    }
  }
  const last = lineStarts.length - 1;
  return {
    line: last + 1,
    column: Math.max(1, offset - (lineStarts[last] ?? 0) + 1),
  };
}

export function linePreview(content: string, from: number): string {
  let start = from;
  while (start > 0 && content[start - 1] !== '\n') start -= 1;
  let end = from;
  while (end < content.length && content[end] !== '\n') end += 1;
  return content.slice(start, end).trim();
}
