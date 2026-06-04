import { useEffect, type RefObject } from 'react';
import { openWysiwygLink, type WikiLinkPickerState } from '../lib/openWysiwygLink';
import { resolveWysiwygLinkUrl } from '../lib/resolveWysiwygLinkUrl';
import { isLinkOpenModifier } from '../lib/wysiwygLinkClick';

export function useWysiwygLinkNavigation(
  hostRef: RefObject<HTMLElement | null>,
  options: {
    onOpenFileRef: RefObject<((relativePath: string) => void) | undefined>;
    onWikiMenuRef: RefObject<
      ((state: WikiLinkPickerState) => void) | undefined
    >;
    remountKey: string;
  },
): void {
  const { onOpenFileRef, onWikiMenuRef, remountKey } = options;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return undefined;
    }

    const handlePointer = (event: MouseEvent) => {
      if (!(event.target instanceof Node) || !host.contains(event.target)) {
        return;
      }

      const linkUrl = resolveWysiwygLinkUrl(event.target, host);
      if (!linkUrl) {
        return;
      }

      if (!isLinkOpenModifier(event)) {
        event.preventDefault();
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      void openWysiwygLink(linkUrl, event, {
        onOpenFile: (path) => onOpenFileRef.current?.(path),
        onShowWikiMenu: (state) => onWikiMenuRef.current?.(state),
      });
    };

    document.addEventListener('mousedown', handlePointer, true);
    document.addEventListener('click', handlePointer, true);

    return () => {
      document.removeEventListener('mousedown', handlePointer, true);
      document.removeEventListener('click', handlePointer, true);
    };
  }, [hostRef, onOpenFileRef, onWikiMenuRef, remountKey]);
}
