export function quoteSqliteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}
