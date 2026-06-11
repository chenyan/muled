import { isMarkdownPath } from './fileLanguage';
import { isPdfPath } from './mime';

/** 源文件对应的旁注路径：`attention.pdf` → `attention.pdf.mnote` */
export function companionMnotePath(sourcePath: string): string {
  return `${sourcePath}.mnote`;
}

export function isMnotePath(relativePath: string | null | undefined): boolean {
  if (!relativePath) return false;
  return /\.mnote$/i.test(relativePath.replace(/\/$/, ''));
}

/** 支持记录笔记的源文件类型（Markdown / PDF） */
export function isMnoteSourcePath(relativePath: string | null | undefined): boolean {
  if (!relativePath) return false;
  return isMarkdownPath(relativePath) || isPdfPath(relativePath);
}
