/** 主进程与 Renderer 统一的 OpenAI user 消息体 */
export function buildAiUserContent(prompt: string, selection: string): string {
  return `${prompt}\n\n---\n${selection}`;
}

export type AiApplyMode = 'append' | 'replace';

export function textAfterAi(
  mode: AiApplyMode,
  selection: string,
  aiText: string,
): string {
  return mode === 'append' ? selection + aiText : aiText;
}

/** 在 content 中定位选区（精确匹配 → trim → 统一换行） */
export function findSelectionSpan(
  content: string,
  selection: string,
): { from: number; to: number } | null {
  if (!selection) return null;

  const candidates = [selection];
  const trimmed = selection.trim();
  if (trimmed && trimmed !== selection) {
    candidates.push(trimmed);
  }

  for (const candidate of candidates) {
    const idx = content.indexOf(candidate);
    if (idx >= 0) {
      return { from: idx, to: idx + candidate.length };
    }
  }

  const normalizedContent = content.replace(/\r\n/g, '\n');
  for (const candidate of candidates) {
    const normalized = candidate.replace(/\r\n/g, '\n');
    const idx = normalizedContent.indexOf(normalized);
    if (idx >= 0) {
      return { from: idx, to: idx + normalized.length };
    }
  }

  return null;
}

/** 在全文 content 中定位 selection 并写入 AI 结果（WYSIWYG 失焦后的回退） */
export function applyAiToContent(
  content: string,
  selection: string,
  mode: AiApplyMode,
  aiText: string,
): string | null {
  const span = findSelectionSpan(content, selection);
  if (!span) return null;
  const atRange = content.slice(span.from, span.to);
  const insert = textAfterAi(mode, atRange, aiText);
  return content.slice(0, span.from) + insert + content.slice(span.to);
}
