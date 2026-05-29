/** 去掉常见公式定界符，供 KaTeX 使用 */
export function normalizeMathSource(source: string): string {
  let value = source.trim();
  if (!value) {
    return value;
  }

  if (value.startsWith('$$') && value.endsWith('$$') && value.length > 4) {
    value = value.slice(2, -2).trim();
  } else if (value.startsWith('\\[') && value.endsWith('\\]')) {
    value = value.slice(2, -2).trim();
  } else if (value.startsWith('\\(') && value.endsWith('\\)')) {
    value = value.slice(2, -2).trim();
  }

  return value;
}

export function hasKatexError(html: string): boolean {
  return html.includes('katex-error');
}
