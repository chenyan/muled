export interface RgSearchMatch {
  kind: 'rg';
  path: string;
  absolutePath: string;
  line: number;
  column: number;
  length: number;
  lineText: string;
  matchText: string;
}

export interface FdSearchMatch {
  kind: 'fd';
  path: string;
  absolutePath: string;
}

export type ShellSearchMatch = RgSearchMatch | FdSearchMatch;

export type ShellSearchError =
  | { code: 'not_installed'; command: 'rg' | 'fd'; hint: string }
  | { code: 'empty_query' }
  | { code: 'failed'; message: string };

export type ShellSearchResult =
  | { ok: true; matches: ShellSearchMatch[] }
  | { ok: false; error: ShellSearchError };

export type SearchStreamEvent =
  | { searchId: number; type: 'match'; match: ShellSearchMatch }
  | { searchId: number; type: 'error'; error: ShellSearchError }
  | { searchId: number; type: 'done' };

export type SearchStartResult =
  | { ok: true }
  | { ok: false; error: ShellSearchError };
