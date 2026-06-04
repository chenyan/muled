import { useCallback, useState } from 'react';
import type { TranslationPopupState } from '../components/ai/TranslationPopup';

export function useTabTranslation() {
  const [translationPopup, setTranslationPopup] =
    useState<TranslationPopupState | null>(null);

  const runTranslate = useCallback(
    async (sentence: string, anchorRect: DOMRect) => {
      const trimmed = sentence.trim();
      if (!trimmed) return;

      setTranslationPopup({
        rect: anchorRect,
        sentence: trimmed,
        status: 'loading',
      });

      const result = await window.muled.ai.translate({ sentence: trimmed });
      if ('error' in result) {
        setTranslationPopup((current) =>
          current
            ? { ...current, status: 'error', error: result.error }
            : null,
        );
        return;
      }

      setTranslationPopup((current) =>
        current
          ? { ...current, status: 'done', content: result.text }
          : null,
      );
    },
    [],
  );

  return {
    translationPopup,
    setTranslationPopup,
    runTranslate,
  };
}
