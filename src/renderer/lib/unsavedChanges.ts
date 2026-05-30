import type { EditorTab } from '../types/tab';
import { isEditableTextTab, tabLabel } from '../types/tab';

export type UnsavedChangesChoice = 'save' | 'discard' | 'cancel';

export type SaveTabFailureReason =
  | 'not_found'
  | 'no_path'
  | 'truncated'
  | 'image';

export type SaveTabResult =
  | { ok: true }
  | { ok: false; reason: SaveTabFailureReason };

/** 未保存对话框中是否允许点「保存」 */
export function canSaveDirtyTab(tab: EditorTab): boolean {
  if (!tab.dirty) return false;
  if (!isEditableTextTab(tab)) return false;
  if (!tab.relativePath) return false;
  if (tab.truncated) return false;
  return true;
}

export function unsavedDialogTitle(tab: EditorTab): string {
  const name = tabLabel(tab);
  return `保存对「${name}」的更改？`;
}

export function unsavedDialogMessage(tab: EditorTab): string {
  if (!tab.relativePath) {
    return '未命名文档有未保存的更改。';
  }
  if (tab.truncated) {
    return '该文件为只读预览，无法保存。';
  }
  if (!isEditableTextTab(tab)) {
    return '此类型的标签页无法保存。';
  }
  return '若不保存，更改将丢失。';
}

/**
 * 在丢弃或覆盖 dirty 内容前询问用户；返回 true 表示可以继续操作。
 */
export async function resolveUnsavedProceed(
  tab: EditorTab | undefined,
  confirm: ((tab: EditorTab) => Promise<UnsavedChangesChoice>) | undefined,
  save: (tabId: string) => Promise<SaveTabResult>,
  onSaveFailed?: (reason: SaveTabFailureReason) => void,
  onSaveSucceeded?: () => void,
): Promise<boolean> {
  if (!tab?.dirty) return true;

  if (!confirm) {
    // eslint-disable-next-line no-alert
    const ok = window.confirm(
      `${unsavedDialogTitle(tab)}\n${unsavedDialogMessage(tab)}`,
    );
    return ok;
  }

  const choice = await confirm(tab);
  if (choice === 'cancel') return false;
  if (choice === 'save') {
    const result = await save(tab.id);
    if (!result.ok) {
      onSaveFailed?.(result.reason);
      return false;
    }
    onSaveSucceeded?.();
  }
  return true;
}
