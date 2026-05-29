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

/** 在全文 content 中定位 selection 并写入 AI 结果（WYSIWYG 失焦后的回退） */
export function applyAiToContent(
  content: string,
  selection: string,
  mode: AiApplyMode,
  aiText: string,
): string | null {
  if (!selection) return null;
  const idx = content.indexOf(selection);
  if (idx < 0) return null;
  const insert = textAfterAi(mode, selection, aiText);
  return content.slice(0, idx) + insert + content.slice(idx + selection.length);
}
