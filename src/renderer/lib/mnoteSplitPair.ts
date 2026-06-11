import { companionMnotePath } from './mnotePath';
import type { EditorTab } from '../types/tab';

export interface MnoteSplitPair {
  source: EditorTab;
  mnote: EditorTab;
  sourcePane: 'primary' | 'secondary';
  mnotePane: 'primary' | 'secondary';
}

export function resolveMnoteSplitPair(
  primary: EditorTab | null,
  secondary: EditorTab | null,
): MnoteSplitPair | null {
  if (!primary?.relativePath || !secondary?.relativePath) return null;

  if (
    primary.kind === 'mnote' &&
    companionMnotePath(secondary.relativePath) === primary.relativePath
  ) {
    return { source: secondary, mnote: primary, sourcePane: 'secondary', mnotePane: 'primary' };
  }

  if (
    secondary.kind === 'mnote' &&
    companionMnotePath(primary.relativePath) === secondary.relativePath
  ) {
    return { source: primary, mnote: secondary, sourcePane: 'primary', mnotePane: 'secondary' };
  }

  return null;
}
