import type { Extension } from '@codemirror/state';
import type { EditorMode } from '../../../shared/types/config';
import schemeParedit from './schemeParedit';
import schemeSemanticSelection from './schemeSemanticSelection';

/**
 * Scheme 结构化编辑与 Vim 的共存策略：
 * - `paredit`：Normal 键位下启用全部 Paredit / 语义选区快捷键
 * - `vim-safe`：Vim 模式下保留 Mod-Alt Paredit（与 Vim 不冲突），
 *   Alt-Arrow 语义选区仅在 insert 模式生效（避免抢占 Normal 模式）
 */
export type SchemeStructuredEditingPolicy = 'paredit' | 'vim-safe';

export function schemeStructuredEditingPolicy(
  keybindingMode: EditorMode,
): SchemeStructuredEditingPolicy {
  return keybindingMode === 'vim' ? 'vim-safe' : 'paredit';
}

export default function schemeStructuredEditing(
  keybindingMode: EditorMode,
): Extension[] {
  const policy = schemeStructuredEditingPolicy(keybindingMode);
  return [schemeParedit({ policy }), schemeSemanticSelection({ policy })];
}
