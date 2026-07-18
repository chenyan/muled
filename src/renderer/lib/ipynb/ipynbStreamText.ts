/** 合并流式 stdout/stderr 分片（支持 tqdm 的 \\r 行内刷新） */
export function mergeStreamText(prev: string, chunk: string): string {
  let result = prev;
  for (let i = 0; i < chunk.length; i += 1) {
    const ch = chunk[i];
    if (ch === '\r') {
      const nl = result.lastIndexOf('\n');
      result = nl >= 0 ? result.slice(0, nl + 1) : '';
      continue;
    }
    if (ch === '\b') {
      result = result.slice(0, -1);
      continue;
    }
    result += ch;
  }
  return result;
}

export function outputText(text: string | string[] | undefined): string {
  if (!text) return '';
  return Array.isArray(text) ? text.join('') : text;
}
