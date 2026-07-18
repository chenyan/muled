import type { EditorViewMode } from '../../shared/types/config';
import type { TabKind } from '../types/tab';
import {
  getSourceLanguageId,
  getSourceLanguageLabel,
} from './fileLanguage';

const MARKDOWN_VIEW_MODE_CYCLE: EditorViewMode[] = [
  'rich-text',
  'source',
  'preview',
];
const HTML_VIEW_MODE_CYCLE: EditorViewMode[] = ['preview', 'source'];
const STRUDEL_VIEW_MODE_CYCLE: EditorViewMode[] = ['preview', 'source'];
const P5_VIEW_MODE_CYCLE: EditorViewMode[] = ['preview', 'source'];
const CSV_VIEW_MODE_CYCLE: EditorViewMode[] = ['preview', 'source'];
const IPYNB_VIEW_MODE_CYCLE: EditorViewMode[] = ['notebook', 'preview', 'source'];
const DOCX_VIEW_MODE_CYCLE: EditorViewMode[] = ['rich-text', 'preview'];
const MNOTE_VIEW_MODE_CYCLE: EditorViewMode[] = ['rich-text', 'source'];

const ORG_VIEW_MODE_CYCLE: EditorViewMode[] = ['preview', 'agenda', 'source'];

export function editorViewModeLabel(
  mode: EditorViewMode,
  relativePath?: string | null,
): string {
  switch (mode) {
    case 'rich-text':
      return 'WYSIWYG';
    case 'source':
      return getSourceLanguageLabel(
        getSourceLanguageId(relativePath ?? null),
      );
    case 'preview':
      return 'Preview';
    case 'notebook':
      return 'Notebook';
    case 'agenda':
      return 'Agenda';
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
  if (
    tabKind === 'html' ||
    tabKind === 'csv' ||
    tabKind === 'ipynb' ||
    tabKind === 'strudel' ||
    tabKind === 'p5'
  ) {
    const cycle =
      tabKind === 'csv'
        ? CSV_VIEW_MODE_CYCLE
        : tabKind === 'ipynb'
          ? IPYNB_VIEW_MODE_CYCLE
          : tabKind === 'strudel'
            ? STRUDEL_VIEW_MODE_CYCLE
            : tabKind === 'p5'
              ? P5_VIEW_MODE_CYCLE
              : HTML_VIEW_MODE_CYCLE;
    const index = cycle.indexOf(current);
    if (index < 0) return 'preview';
    return cycle[(index + 1) % cycle.length];
  }
  if (tabKind === 'docx') {
    const index = DOCX_VIEW_MODE_CYCLE.indexOf(current);
    if (index < 0) return 'rich-text';
    return DOCX_VIEW_MODE_CYCLE[(index + 1) % DOCX_VIEW_MODE_CYCLE.length];
  }
  if (tabKind === 'markdown') {
    return nextEditorViewMode(current);
  }
  if (tabKind === 'mnote') {
    const index = MNOTE_VIEW_MODE_CYCLE.indexOf(current);
    if (index < 0) return 'rich-text';
    return MNOTE_VIEW_MODE_CYCLE[(index + 1) % MNOTE_VIEW_MODE_CYCLE.length];
  }
  if (tabKind === 'org') {
    const index = ORG_VIEW_MODE_CYCLE.indexOf(current);
    if (index < 0) return 'preview';
    return ORG_VIEW_MODE_CYCLE[(index + 1) % ORG_VIEW_MODE_CYCLE.length];
  }
  return current;
}
