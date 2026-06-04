import type { SelectionScope } from '@embedpdf/plugin-selection';

export async function getPdfSelectionSentence(
  scope: SelectionScope,
): Promise<string | null> {
  try {
    const parts = await scope.getSelectedText().toPromise();
    const sentence = parts.join('\n').trim();
    return sentence || null;
  } catch {
    return null;
  }
}
