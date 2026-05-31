/** 粘贴公式时常见的不可见 Unicode 字符 */
const INVISIBLE_MATH_CHARS_RE =
  /[\u00AD\u200B-\u200D\u2060-\u2064\uFEFF]/g;

/** 去掉常见公式定界符与不可见字符，供 MathJax 使用 */
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

  return value.replace(INVISIBLE_MATH_CHARS_RE, '');
}
