import type { ShellSearchMatch } from '../../shared/types/search';

export type PaletteShellCommand = 'rg' | 'fd';

export interface ParsedPaletteShellSearch {
  command: PaletteShellCommand;
  query: string;
}

export function parsePaletteShellSearch(
  input: string,
): ParsedPaletteShellSearch | null {
  const trimmed = input.trimStart();
  if (trimmed.startsWith('rg ')) {
    return { command: 'rg', query: trimmed.slice(3) };
  }
  if (trimmed.startsWith('fd ')) {
    return { command: 'fd', query: trimmed.slice(3) };
  }
  return null;
}

export function paletteShellSearchLabel(match: ShellSearchMatch): string {
  if (match.kind === 'rg') {
    return `${match.path}:${match.line}:${match.column + 1}`;
  }
  return match.path;
}

export function paletteShellSearchDetail(match: ShellSearchMatch): string | null {
  if (match.kind === 'rg') {
    return match.lineText.trim() || match.matchText;
  }
  return null;
}
