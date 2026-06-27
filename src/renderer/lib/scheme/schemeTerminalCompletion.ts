import { isSchemeTerminalKeyword, SCHEME_TERMINAL_KEYWORDS } from './schemeTerminalKeywords';

export interface SchemeTerminalCompletionMatch {
  label: string;
  kind: 'keyword' | 'symbol';
}

export function collectSchemeTerminalCompletions(args: {
  prefix: string;
  envSymbols: readonly string[];
}): SchemeTerminalCompletionMatch[] {
  const normalizedPrefix = args.prefix;
  const lowerPrefix = normalizedPrefix.toLowerCase();
  const seen = new Set<string>();
  const matches: SchemeTerminalCompletionMatch[] = [];

  const consider = (label: string, kind: SchemeTerminalCompletionMatch['kind']) => {
    if (seen.has(label)) return;
    if (
      normalizedPrefix &&
      !label.startsWith(normalizedPrefix) &&
      !label.toLowerCase().startsWith(lowerPrefix)
    ) {
      return;
    }
    seen.add(label);
    matches.push({ label, kind });
  };

  for (const keyword of SCHEME_TERMINAL_KEYWORDS) {
    consider(keyword, 'keyword');
  }
  for (const symbol of args.envSymbols) {
    if (isSchemeTerminalKeyword(symbol)) continue;
    consider(symbol, 'symbol');
  }

  matches.sort((a, b) => {
    const kindOrder = a.kind === b.kind ? 0 : a.kind === 'keyword' ? -1 : 1;
    if (kindOrder !== 0) return kindOrder;
    return a.label.localeCompare(b.label);
  });

  return matches;
}

export function completionInsertSuffix(
  prefix: string,
  candidate: string,
): string {
  if (!prefix) return candidate;
  if (candidate.startsWith(prefix)) {
    return candidate.slice(prefix.length);
  }
  const lowerPrefix = prefix.toLowerCase();
  if (candidate.toLowerCase().startsWith(lowerPrefix)) {
    return candidate.slice(prefix.length);
  }
  return candidate;
}
