/** 按顶层块拆分 Markdown，尊重围栏代码块边界 */
export function splitTopLevelMarkdownBlocks(source: string): string[] {
  if (!source.trim()) {
    return [];
  }

  const blocks: string[] = [];
  let current: string[] = [];
  let inFence = false;
  let fenceChar = '';
  let fenceLength = 0;

  const lines = source.split('\n');

  for (const line of lines) {
    const fenceMatch = line.match(/^(`{3,}|~{3,})(.*)$/);
    if (fenceMatch) {
      const marker = fenceMatch[1];
      const char = marker[0];
      const length = marker.length;

      if (!inFence) {
        inFence = true;
        fenceChar = char;
        fenceLength = length;
      } else if (char === fenceChar && length >= fenceLength) {
        inFence = false;
        fenceChar = '';
        fenceLength = 0;
      }
    }

    if (!inFence && line.trim() === '' && current.length > 0) {
      blocks.push(current.join('\n'));
      current = [];
      continue;
    }

    current.push(line);
  }

  if (current.length > 0) {
    blocks.push(current.join('\n'));
  }

  return blocks;
}
