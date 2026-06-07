const INLINE_CODE_RE = /(`+)([^`\n]*?)\1/g;

/** 仅变换行内代码（`...`）以外的片段，保留反引号内字面量 */
export function mapOutsideInlineCode(
  source: string,
  transform: (segment: string) => string,
): string {
  if (!source.includes('`')) {
    return transform(source);
  }

  let result = '';
  let lastIndex = 0;
  INLINE_CODE_RE.lastIndex = 0;
  let match = INLINE_CODE_RE.exec(source);

  while (match !== null) {
    if (match.index > lastIndex) {
      result += transform(source.slice(lastIndex, match.index));
    }
    result += match[0];
    lastIndex = match.index + match[0].length;
    match = INLINE_CODE_RE.exec(source);
  }

  if (lastIndex < source.length) {
    result += transform(source.slice(lastIndex));
  }

  return result;
}
