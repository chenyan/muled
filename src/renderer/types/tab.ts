import type { EditorMode, EditorViewMode } from '../../shared/types/config';

export type TabKind =
  | 'markdown'
  | 'html'
  | 'text'
  | 'image'
  | 'pdf'
  | 'audio'
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
  /** 打开后定位并高亮匹配 */
  reveal?: EditorRevealTarget;
}

/** 可在编辑器中修改并保存的文本类 Tab */
export function isEditableTextTab(tab: EditorTab): boolean {
  return tab.kind === 'markdown' || tab.kind === 'html' || tab.kind === 'text';
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
