import type { EditorViewMode } from '../../shared/types/config';

const VIEW_MODE_CYCLE: EditorViewMode[] = ['rich-text', 'source', 'preview'];

export function editorViewModeLabel(mode: EditorViewMode): string {
  switch (mode) {
    case 'rich-text':
      return 'WYSIWYG';
    case 'source':
      return 'Source';
    case 'preview':
      return 'Preview';
  }
}

export function nextEditorViewMode(current: EditorViewMode): EditorViewMode {
  const index = VIEW_MODE_CYCLE.indexOf(current);
  if (index < 0) return 'rich-text';
  return VIEW_MODE_CYCLE[(index + 1) % VIEW_MODE_CYCLE.length];
}
