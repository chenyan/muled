function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

export type InlineMathSegment =
  | { type: 'text'; value: string }
  | { type: 'math'; value: string };

export type InlineMathSplitPart =
  | { kind: 'text'; text: string }
  | { kind: 'math'; latex: string };

/**
 * 按行扫描 `$...$`：开闭 `$` 须在同一行；无闭合 `$` 的 `$` 保留为文本。
 * `$$` 不在此处理（由块级公式归一化负责）。
 */
export function scanInlineMathSegments(line: string): InlineMathSegment[] {
  const segments: InlineMathSegment[] = [];
  let i = 0;

  while (i < line.length) {
    if (line[i] === '$') {
      if (line[i + 1] === '$') {
        segments.push({ type: 'text', value: '$$' });
        i += 2;
        continue;
      }

      const closeIndex = line.indexOf('$', i + 1);
      if (closeIndex === -1) {
        segments.push({ type: 'text', value: '$' });
        i += 1;
        continue;
      }

      segments.push({ type: 'math', value: line.slice(i + 1, closeIndex) });
      i = closeIndex + 1;
      continue;
    }

    let next = i;
    while (next < line.length && line[next] !== '$') {
      next += 1;
    }
    segments.push({ type: 'text', value: line.slice(i, next) });
    i = next;
  }

  return segments.length > 0 ? segments : [{ type: 'text', value: line }];
}

/** 将行内 `$...$` 转为 WYSIWYG 用的 `<span data-muled-math>` */
export function replaceInlineMathDelimiters(text: string): string {
  return text
    .split('\n')
    .map((line) =>
      scanInlineMathSegments(line)
        .map((segment) => {
          if (segment.type === 'text') {
            return segment.value;
          }
          return `<span data-muled-math="${escapeHtmlAttr(segment.value)}"></span>`;
        })
        .join(''),
    )
    .join('\n');
}

/** 将含 `$...$` 的 mdast 文本拆为普通文本与行内公式片段（按行配对） */
export function splitTextWithInlineMath(value: string): InlineMathSplitPart[] {
  const lines = value.split('\n');
  const parts: InlineMathSplitPart[] = [];

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    if (lineIndex > 0) {
      parts.push({ kind: 'text', text: '\n' });
    }

    for (const segment of scanInlineMathSegments(lines[lineIndex])) {
      if (segment.type === 'text') {
        if (segment.value) {
          parts.push({ kind: 'text', text: segment.value });
        }
      } else {
        parts.push({ kind: 'math', latex: segment.value });
      }
    }
  }

  return parts;
}

/** 文本是否可能含行内 `$...$`（供 import visitor 快速过滤） */
export function textMayContainInlineMath(value: string): boolean {
  return /(?<!\$)\$(?!\$)/.test(value);
}

/** 行内公式渲染失败时展示的原文 */
export function inlineMathFallbackText(latex: string): string {
  return `$${latex}$`;
}
