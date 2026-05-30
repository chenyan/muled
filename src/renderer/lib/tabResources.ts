import type { EditorTab } from '../types/tab';
import { clearWikiImagePreviewCache } from './resolveWikiImagePreview';

/** 释放 Tab 关联的全局缓存（data URL 由 React state 移除后由 GC 回收） */
export function releaseTabResources(tab: EditorTab): void {
  if (tab.kind === 'markdown') {
    clearWikiImagePreviewCache();
  }
}

/** 从 state 中剥离 PDF/图片的二进制载荷，保留 relativePath 以便再次激活时从磁盘加载 */
export function releaseTabBinaryPayload(tab: EditorTab): EditorTab {
  if (tab.kind === 'pdf' && tab.pdfSrc) {
    return { ...tab, pdfSrc: undefined };
  }
  if (tab.kind === 'image' && tab.imageSrc) {
    return { ...tab, imageSrc: undefined };
  }
  return tab;
}

export function needsBinaryHydration(tab: EditorTab): boolean {
  if (!tab.relativePath) return false;
  if (tab.kind === 'pdf') return !tab.pdfSrc;
  if (tab.kind === 'image') return !tab.imageSrc;
  return false;
}
