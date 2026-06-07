import type { EditorMode, EditorViewMode } from '../../shared/types/config';

export type TabKind =
  | 'markdown'
  | 'html'
  | 'docx'
  | 'pptx'
  | 'text'
  | 'csv'
  | 'xlsx'
  | 'ipynb'
  | 'image'
  | 'pdf'
  | 'audio'
  | 'video'
  | 'directory-grid';

export interface EditorRevealTarget {
  id: string;
  line: number;
  column: number;
  length: number;
}

export interface EditorTab {
  id: string;
  /** 相对 workspace 根的路径 */
  relativePath: string | null;
  kind: TabKind;
  dirty: boolean;
  keybindingMode: EditorMode;
  viewMode: EditorViewMode;
  content: string;
  truncated: boolean;
  fileSize: number;
  /** 图片 Tab：data URL */
  imageSrc?: string;
  /** PDF Tab：data URL */
  pdfSrc?: string;
  /** 音频 Tab：data URL */
  audioSrc?: string;
  /** 视频 Tab：data URL */
  videoSrc?: string;
  /** DOCX Tab：data URL */
  docxSrc?: string;
  /** PPTX Tab：data URL */
  pptxSrc?: string;
  /** XLSX Tab：data URL */
  xlsxSrc?: string;
  /** 打开后定位并高亮匹配 */
  reveal?: EditorRevealTarget;
}

/** 可在编辑器中修改并保存的文本类 Tab */
export function isEditableTextTab(tab: EditorTab): boolean {
  return (
    tab.kind === 'markdown' ||
    tab.kind === 'html' ||
    tab.kind === 'text' ||
    tab.kind === 'csv' ||
    tab.kind === 'ipynb'
  );
}

/** 可保存的 Tab（文本、DOCX 或 XLSX） */
export function isSavableTab(tab: EditorTab): boolean {
  return isEditableTextTab(tab) || tab.kind === 'docx' || tab.kind === 'xlsx';
}

export function tabLabel(tab: EditorTab): string {
  if (!tab.relativePath) {
    return 'Untitled';
  }
  if (tab.kind === 'directory-grid') {
    const trimmed = tab.relativePath.replace(/\/$/, '');
    const name = trimmed.split('/').pop() ?? trimmed;
    return name ? `${name}/` : tab.relativePath;
  }
  const parts = tab.relativePath.split('/');
  return parts[parts.length - 1] || tab.relativePath;
}
