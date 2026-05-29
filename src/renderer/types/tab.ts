import type { EditorMode, EditorViewMode } from '../../shared/types/config';

export type TabKind = 'markdown' | 'text' | 'image';

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
}

/** 可在编辑器中修改并保存的文本类 Tab */
export function isEditableTextTab(tab: EditorTab): boolean {
  return tab.kind === 'markdown' || tab.kind === 'text';
}

export function tabLabel(tab: EditorTab): string {
  if (!tab.relativePath) {
    return 'Untitled';
  }
  const parts = tab.relativePath.split('/');
  return parts[parts.length - 1] || tab.relativePath;
}
