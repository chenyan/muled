import type { EditorMode, EditorViewMode } from '../../shared/types/config';

export default function keybindingModePatch(
  currentViewMode: EditorViewMode,
  mode: EditorMode,
): { keybindingMode: EditorMode; viewMode?: EditorViewMode } {
  if (
    mode === 'vim' &&
    (currentViewMode === 'rich-text' ||
      currentViewMode === 'preview' ||
      currentViewMode === 'notebook' ||
      currentViewMode === 'agenda')
  ) {
    return { keybindingMode: mode, viewMode: 'source' };
  }
  return { keybindingMode: mode };
}
