import type { EditorMode, EditorViewMode } from '../../shared/types/config';

export type TabKind =
  | 'markdown'
  | 'mnote'
  | 'html'
  | 'docx'
  | 'pptx'
  | 'text'
  | 'csv'
  | 'sqlite3'
  | 'duckdb'
  | 'xlsx'
  | 'ipynb'
  | 'strudel'
  | 'p5'
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
  /** 多行高亮终止行（含） */
  endLine?: number;
}

export interface PdfRevealTarget {
  id: string;
  page: number;
  bbox?: [number, number, number, number];
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
  /** PDF Tab：原始字节（经 IPC 传入，避免 base64 data URL） */
  pdfBuffer?: ArrayBuffer;
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
  /** PDF 笔记定位：页码 + 可选归一化 bbox */
  pdfReveal?: PdfRevealTarget;
  /** PDF 上次阅读页码（1-based），用于重挂载后恢复位置 */
  pdfLastPage?: number;
  /** HTML 预览跨页导航后待滚动的页内锚点 */
  htmlPreviewHash?: string;
}

/** 可在编辑器中修改并保存的文本类 Tab */
export function isEditableTextTab(tab: EditorTab): boolean {
  return (
    tab.kind === 'markdown' ||
    tab.kind === 'mnote' ||
    tab.kind === 'html' ||
    tab.kind === 'text' ||
    tab.kind === 'csv' ||
    tab.kind === 'ipynb' ||
    tab.kind === 'strudel' ||
    tab.kind === 'p5'
  );
}

/** 当前 Tab 是否使用 CodeMirror Source 编辑器 */
export function tabUsesSourceCodeEditor(tab: EditorTab): boolean {
  if (!isEditableTextTab(tab)) return false;
  if (tab.kind === 'text') return true;
  if (tab.viewMode !== 'source') return false;
  return (
    tab.kind === 'markdown' ||
    tab.kind === 'mnote' ||
    tab.kind === 'html' ||
    tab.kind === 'csv' ||
    tab.kind === 'ipynb' ||
    tab.kind === 'strudel' ||
    tab.kind === 'p5'
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
