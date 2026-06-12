import {
  applyAiToContent,
  findSelectionSpan,
  textAfterAi,
  type AiApplyMode,
} from '../../shared/buildAiPrompt';
import type { EditorAiSnapshot } from './editorAiBridge';

function clampSourceRange(
  content: string,
  range: { from: number; to: number },
): { from: number; to: number } | null {
  const from = Math.max(0, Math.min(range.from, content.length));
  const to = Math.max(from, Math.min(range.to, content.length));
  if (from >= to) return null;
  return { from, to };
}

function applyAtSpan(
  content: string,
  span: { from: number; to: number },
  mode: AiApplyMode,
  aiText: string,
): string {
  const atRange = content.slice(span.from, span.to);
  const insert = textAfterAi(mode, atRange, aiText);
  return content.slice(0, span.from) + insert + content.slice(span.to);
}

function clampInsertPosition(content: string, pos: number): number {
  return Math.max(0, Math.min(pos, content.length));
}

/** 将 AI 结果写回文档字符串 */
// eslint-disable-next-line import/prefer-default-export
export function applyAiInEditor(
  content: string,
  snapshot: EditorAiSnapshot,
  mode: AiApplyMode,
  aiText: string,
): string | null {
  const { selection, sourceRange } = snapshot;

  if (sourceRange) {
    const from = clampInsertPosition(content, sourceRange.from);
    const to = clampInsertPosition(content, sourceRange.to);
    if (from < to) {
      return applyAtSpan(content, { from, to }, mode, aiText);
    }
    if (from === to && mode === 'append') {
      return content.slice(0, from) + aiText + content.slice(from);
    }
  }

  if (!selection) {
    return mode === 'append' ? content + aiText : null;
  }

  const clamped = sourceRange ? clampSourceRange(content, sourceRange) : null;
  if (clamped) {
    return applyAtSpan(content, clamped, mode, aiText);
  }

  const span = findSelectionSpan(content, selection);
  if (span) {
    return applyAtSpan(content, span, mode, aiText);
  }

  return applyAiToContent(content, selection, mode, aiText);
}
