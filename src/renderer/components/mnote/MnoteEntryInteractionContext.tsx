import { createContext, useContext } from 'react';
import type { MnoteEntry } from '../../lib/mnoteFormat';

export interface MnoteEntryInteractionContextValue {
  onEntryClick?: (entry: MnoteEntry) => void;
  activeEntryId?: string | null;
  onEdit?: () => void;
}

export const MnoteEntryInteractionContext =
  createContext<MnoteEntryInteractionContextValue>({});

export function useMnoteEntryInteraction(): MnoteEntryInteractionContextValue {
  return useContext(MnoteEntryInteractionContext);
}
