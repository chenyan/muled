import { pushStatusToast } from './statusToast';
import {
  rankWikiLinkMatches,
  searchFdOnce,
  type FdSearchOnceResult,
} from './searchFdOnce';
import type { FdSearchMatch, ShellSearchError } from '../../shared/types/search';

function shellSearchErrorMessage(error: ShellSearchError): string {
  if (error.code === 'not_installed') {
    return error.hint;
  }
  if (error.code === 'empty_query') {
    return '请输入页面标题';
  }
  return error.message;
}

export type WikiLinkNavigationResult =
  | { kind: 'open'; path: string }
  | { kind: 'choose'; title: string; matches: FdSearchMatch[] }
  | { kind: 'none'; title: string }
  | { kind: 'error'; message: string };

export async function resolveWikiLinkNavigation(
  title: string,
): Promise<WikiLinkNavigationResult> {
  const trimmed = title.trim();
  if (!trimmed) {
    return { kind: 'error', message: '无效的 wiki 链接' };
  }

  let result: FdSearchOnceResult;
  try {
    result = await searchFdOnce(trimmed);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { kind: 'error', message };
  }

  if (!result.ok) {
    return { kind: 'error', message: shellSearchErrorMessage(result.error) };
  }

  const matches = rankWikiLinkMatches(trimmed, result.matches);
  if (matches.length === 0) {
    return { kind: 'none', title: trimmed };
  }
  if (matches.length === 1) {
    return { kind: 'open', path: matches[0].path };
  }
  return { kind: 'choose', title: trimmed, matches };
}

export function notifyWikiLinkNavigationResult(
  result: WikiLinkNavigationResult,
): void {
  if (result.kind === 'none') {
    pushStatusToast(`未找到页面: ${result.title}`, 'info');
    return;
  }
  if (result.kind === 'error') {
    pushStatusToast(result.message, 'error');
  }
}
