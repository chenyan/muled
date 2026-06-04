/**
 * 将单个 fd/rg 搜索模式包成 shell 引号参数，避免含空格时被拆成多个 argv。
 */
export function quoteShellSearchPattern(pattern: string): string {
  const trimmed = pattern.trim();
  if (!/\s/.test(trimmed)) {
    return trimmed;
  }
  return `"${trimmed.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}
