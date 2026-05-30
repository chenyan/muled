import {
  canSaveDirtyTab,
  resolveUnsavedProceed,
  unsavedDialogTitle,
} from '../renderer/lib/unsavedChanges';
import type { EditorTab } from '../renderer/types/tab';

function tab(overrides: Partial<EditorTab> = {}): EditorTab {
  return {
    id: 't1',
    relativePath: 'notes.md',
    kind: 'markdown',
    dirty: true,
    keybindingMode: 'vim',
    viewMode: 'source',
    content: 'hello',
    truncated: false,
    fileSize: 5,
    ...overrides,
  };
}

describe('canSaveDirtyTab', () => {
  it('allows save for dirty text file with path', () => {
    expect(canSaveDirtyTab(tab())).toBe(true);
  });

  it('disallows untitled', () => {
    expect(canSaveDirtyTab(tab({ relativePath: null }))).toBe(false);
  });

  it('skips clean tabs', () => {
    expect(canSaveDirtyTab(tab({ dirty: false }))).toBe(false);
  });
});

describe('resolveUnsavedProceed', () => {
  it('proceeds when tab is clean', async () => {
    const save = jest.fn();
    await expect(
      resolveUnsavedProceed(tab({ dirty: false }), jest.fn(), save),
    ).resolves.toBe(true);
    expect(save).not.toHaveBeenCalled();
  });

  it('cancels on cancel choice', async () => {
    const confirm = jest.fn().mockResolvedValue('cancel' as const);
    const save = jest.fn();
    await expect(
      resolveUnsavedProceed(tab(), confirm, save),
    ).resolves.toBe(false);
    expect(save).not.toHaveBeenCalled();
  });

  it('saves then proceeds on save choice', async () => {
    const confirm = jest.fn().mockResolvedValue('save' as const);
    const save = jest.fn().mockResolvedValue({ ok: true as const });
    const onSaveSucceeded = jest.fn();
    await expect(
      resolveUnsavedProceed(tab(), confirm, save, undefined, onSaveSucceeded),
    ).resolves.toBe(true);
    expect(save).toHaveBeenCalledWith('t1');
    expect(onSaveSucceeded).toHaveBeenCalled();
  });

  it('discards without saving', async () => {
    const confirm = jest.fn().mockResolvedValue('discard' as const);
    const save = jest.fn();
    await expect(
      resolveUnsavedProceed(tab(), confirm, save),
    ).resolves.toBe(true);
    expect(save).not.toHaveBeenCalled();
  });

  it('stays on save failure', async () => {
    const confirm = jest.fn().mockResolvedValue('save' as const);
    const save = jest.fn().mockResolvedValue({
      ok: false as const,
      reason: 'truncated' as const,
    });
    const onSaveFailed = jest.fn();
    await expect(
      resolveUnsavedProceed(tab(), confirm, save, onSaveFailed),
    ).resolves.toBe(false);
    expect(onSaveFailed).toHaveBeenCalledWith('truncated');
  });
});

describe('unsavedDialogTitle', () => {
  it('includes file name', () => {
    expect(unsavedDialogTitle(tab())).toContain('notes.md');
  });
});
