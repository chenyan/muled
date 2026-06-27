const DEFINE_BINDING_RE =
  /\(\s*define(?:-syntax|-record-type)?\s+(?:\(\s*([^\s()]+)|([^()\s;#|]+))/g;

const IDENT_RE = /[a-zA-Z!$%&*+\-./:<=>?@^_~]/;

/** 从 Scheme 源码中提取顶层 define / define-syntax 绑定名（供 REPL 补全） */
export function extractSchemeTopLevelSymbols(source: string): string[] {
  const symbols = new Set<string>();
  for (const match of source.matchAll(DEFINE_BINDING_RE)) {
    const name = (match[1] ?? match[2])?.trim();
    if (!name || !IDENT_RE.test(name)) continue;
    symbols.add(name);
  }
  return [...symbols].sort((a, b) => a.localeCompare(b));
}

export function mergeSchemeTerminalSymbols(
  existing: readonly string[],
  additions: readonly string[],
): string[] {
  const merged = new Set(existing);
  for (const name of additions) {
    merged.add(name);
  }
  return [...merged].sort((a, b) => a.localeCompare(b));
}
