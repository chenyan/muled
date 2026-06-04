import { quoteShellSearchPattern } from '../../shared/shellQuote';
import type {
  FdSearchMatch,
  ShellSearchError,
} from '../../shared/types/search';

let nextSearchId = 1;

export type FdSearchOnceResult =
  | { ok: true; matches: FdSearchMatch[] }
  | { ok: false; error: ShellSearchError };

/** 在工作区根目录执行一次 fd 搜索并等待完成 */
export function searchFdOnce(query: string): Promise<FdSearchOnceResult> {
  const trimmed = query.trim();
  if (!trimmed) {
    return Promise.resolve({ ok: false, error: { code: 'empty_query' } });
  }

  return new Promise((resolve) => {
    const searchId = nextSearchId;
    nextSearchId += 1;
    const matches: FdSearchMatch[] = [];
    let settled = false;

    const finish = (result: FdSearchOnceResult) => {
      if (settled) return;
      settled = true;
      unsubscribe();
      resolve(result);
    };

    const unsubscribe = window.muled.search.onStream((event) => {
      if (event.searchId !== searchId) {
        return;
      }
      if (event.type === 'match') {
        if (event.match.kind === 'fd') {
          matches.push(event.match);
        }
        return;
      }
      if (event.type === 'error') {
        finish({ ok: false, error: event.error });
        return;
      }
      if (event.type === 'done') {
        finish({ ok: true, matches });
      }
    });

    const fdQuery = quoteShellSearchPattern(trimmed);
    void window.muled.search.start({ searchId, command: 'fd', query: fdQuery }).then(
      (result) => {
        if (!result.ok) {
          finish({ ok: false, error: result.error });
        }
      },
    );
  });
}

const PAGE_EXT_RE = /\.(md|mdx|markdown)$/i;

export function isWikiPagePath(relativePath: string): boolean {
  return PAGE_EXT_RE.test(relativePath);
}

export function wikiPageBasename(relativePath: string): string {
  const name = relativePath.split('/').pop() ?? relativePath;
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(0, dot) : name;
}

/** 过滤 markdown 页面并按标题精确匹配优先排序 */
export function rankWikiLinkMatches(
  title: string,
  matches: FdSearchMatch[],
): FdSearchMatch[] {
  const normalizedTitle = title.trim();
  return matches
    .filter((match) => isWikiPagePath(match.path))
    .sort((a, b) => {
      const aExact = wikiPageBasename(a.path) === normalizedTitle;
      const bExact = wikiPageBasename(b.path) === normalizedTitle;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      return a.path.localeCompare(b.path, undefined, { sensitivity: 'base' });
    });
}
