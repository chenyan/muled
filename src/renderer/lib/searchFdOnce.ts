import { quoteShellSearchPattern } from '../../shared/shellQuote';
import type {
  FdSearchMatch,
  ShellSearchError,
} from '../../shared/types/search';

let nextSearchId = 1;

export type FdSearchOnceResult =
  | { ok: true; matches: FdSearchMatch[] }
  | { ok: false; error: ShellSearchError };

const WIKI_PAGE_EXT_RE = /\.(md|mdx|markdown)$/i;

/** wiki 链接标题是否指向非 markdown 文件（含扩展名且不是 .md/.mdx/.markdown） */
export function wikiLinkTitleLooksLikeFile(title: string): boolean {
  const trimmed = title.trim();
  const slash = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'));
  const name = slash >= 0 ? trimmed.slice(slash + 1) : trimmed;
  const dot = name.lastIndexOf('.');
  if (dot <= 0 || dot === name.length - 1) {
    return false;
  }
  return !WIKI_PAGE_EXT_RE.test(name);
}

function wikiLinkTitleFileName(title: string): string {
  const trimmed = title.trim().replace(/\\/g, '/');
  const slash = trimmed.lastIndexOf('/');
  return slash >= 0 ? trimmed.slice(slash + 1) : trimmed;
}

/** 构建 wiki 链接导航用的 fd 查询：非 md 文件用 --glob 按文件名搜 */
export function buildWikiLinkFdQuery(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) {
    return '';
  }
  if (wikiLinkTitleLooksLikeFile(trimmed)) {
    const fileName = wikiLinkTitleFileName(trimmed);
    return `--glob ${quoteShellSearchPattern(fileName)}`;
  }
  return quoteShellSearchPattern(trimmed);
}

/** 在工作区根目录执行一次 fd 搜索并等待完成 */
export function searchFdOnce(fdQuery: string): Promise<FdSearchOnceResult> {
  const trimmed = fdQuery.trim();
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

    void window.muled.search.start({ searchId, command: 'fd', query: trimmed }).then(
      (result) => {
        if (!result.ok) {
          finish({ ok: false, error: result.error });
        }
      },
    );
  });
}

export function isWikiPagePath(relativePath: string): boolean {
  return WIKI_PAGE_EXT_RE.test(relativePath);
}

export function fileBasename(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, '/');
  const slash = normalized.lastIndexOf('/');
  return slash >= 0 ? normalized.slice(slash + 1) : normalized;
}

export function wikiPageBasename(relativePath: string): string {
  const name = relativePath.split('/').pop() ?? relativePath;
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(0, dot) : name;
}

function rankWikiLinkPageMatches(
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

/** 非 markdown：按完整文件名匹配并排序 */
export function rankWikiLinkFileMatches(
  title: string,
  matches: FdSearchMatch[],
): FdSearchMatch[] {
  const want = wikiLinkTitleFileName(title);
  return matches
    .filter(
      (match) =>
        fileBasename(match.path).localeCompare(want, undefined, {
          sensitivity: 'base',
        }) === 0,
    )
    .sort((a, b) => a.path.localeCompare(b.path, undefined, { sensitivity: 'base' }));
}

/** 按链接目标类型过滤 fd 结果并排序 */
export function rankWikiLinkMatches(
  title: string,
  matches: FdSearchMatch[],
): FdSearchMatch[] {
  if (wikiLinkTitleLooksLikeFile(title)) {
    return rankWikiLinkFileMatches(title, matches);
  }
  return rankWikiLinkPageMatches(title, matches);
}
