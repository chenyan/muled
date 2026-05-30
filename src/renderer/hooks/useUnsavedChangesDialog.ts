import { useCallback, useState } from 'react';
import type { EditorTab } from '../types/tab';
import type { UnsavedChangesChoice } from '../lib/unsavedChanges';

type Pending = {
  tab: EditorTab;
  resolve: (choice: UnsavedChangesChoice) => void;
};

export function useUnsavedChangesDialog() {
  const [pending, setPending] = useState<Pending | null>(null);

  const confirmUnsaved = useCallback((tab: EditorTab): Promise<UnsavedChangesChoice> => {
    if (!tab.dirty) return Promise.resolve('discard');
    return new Promise((resolve) => {
      setPending({ tab, resolve });
    });
  }, []);

  const finish = useCallback((choice: UnsavedChangesChoice) => {
    setPending((current) => {
      current?.resolve(choice);
      return null;
    });
  }, []);

  const dialogTab = pending?.tab ?? null;

  return {
    dialogTab,
    confirmUnsaved,
    chooseSave: () => finish('save'),
    chooseDiscard: () => finish('discard'),
    chooseCancel: () => finish('cancel'),
  };
}
