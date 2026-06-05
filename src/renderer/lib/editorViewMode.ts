import type { EditorViewMode } from '../../shared/types/config';
import type { TabKind } from '../types/tab';

const MARKDOWN_VIEW_MODE_CYCLE: EditorViewMode[] = [
  'rich-text',
  'source',
  'preview',
];
const HTML_VIEW_MODE_CYCLE: EditorViewMode[] = ['preview', 'source'];

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
  const index = MARKDOWN_VIEW_MODE_CYCLE.indexOf(current);
  if (index < 0) return 'rich-text';
  return MARKDOWN_VIEW_MODE_CYCLE[(index + 1) % MARKDOWN_VIEW_MODE_CYCLE.length];
}

export function nextViewModeForTab(
  tabKind: TabKind,
  current: EditorViewMode,
): EditorViewMode {
  if (tabKind === 'html') {
    const index = HTML_VIEW_MODE_CYCLE.indexOf(current);
    if (index < 0) return 'preview';
    return HTML_VIEW_MODE_CYCLE[(index + 1) % HTML_VIEW_MODE_CYCLE.length];
  }
  if (tabKind === 'markdown') {
    return nextEditorViewMode(current);
  }
  return current;
}
