import {
  applyAiToContent,
  textAfterAi,
  type AiApplyMode,
} from '../../shared/buildAiPrompt';
import type { EditorAiSnapshot } from './editorAiBridge';

/** 将 AI 结果写回文档字符串 */
// eslint-disable-next-line import/prefer-default-export
export function applyAiInEditor(
  content: string,
  snapshot: EditorAiSnapshot,
  mode: AiApplyMode,
  aiText: string,
): string | null {
  const { selection, sourceRange } = snapshot;
  if (!selection) return null;

  if (sourceRange && sourceRange.from < sourceRange.to) {
    const insert = textAfterAi(mode, selection, aiText);
    return (
      content.slice(0, sourceRange.from) +
      insert +
      content.slice(sourceRange.to)
    );
  }

  return applyAiToContent(content, selection, mode, aiText);
}
