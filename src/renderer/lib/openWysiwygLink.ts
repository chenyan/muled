import type { FdSearchMatch } from '../../shared/types/search';
import {
  notifyWikiLinkNavigationResult,
  resolveWikiLinkNavigation,
} from './resolveWikiLinkNavigation';
import {
  isExternalLinkHref,
  isWikiLinkHref,
  wikiLinkTitleFromHref,
} from './wysiwygLinkClick';

export interface WikiLinkPickerState {
  x: number;
  y: number;
  title: string;
  matches: FdSearchMatch[];
}

async function openExternalLink(url: string): Promise<void> {
  try {
    await window.muled.shell.openExternal(url);
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

export async function openWysiwygLink(
  url: string,
  event: Pick<MouseEvent, 'clientX' | 'clientY'>,
  options?: {
    onOpenFile?: (relativePath: string) => void;
    onShowWikiMenu?: (state: WikiLinkPickerState) => void;
  },
): Promise<void> {
  if (isWikiLinkHref(url)) {
    const title = wikiLinkTitleFromHref(url);
    const result = await resolveWikiLinkNavigation(title);
    if (result.kind === 'open') {
      options?.onOpenFile?.(result.path);
      return;
    }
    if (result.kind === 'choose') {
      options?.onShowWikiMenu?.({
        x: event.clientX,
        y: event.clientY,
        title: result.title,
        matches: result.matches,
      });
      return;
    }
    notifyWikiLinkNavigationResult(result);
    return;
  }

  if (isExternalLinkHref(url)) {
    await openExternalLink(url);
  }
}
