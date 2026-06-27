import {
  autocompletion,
  type Completion,
  type CompletionContext,
  type CompletionResult,
} from '@codemirror/autocomplete';
import type { Extension } from '@codemirror/state';
import { collectSchemeTerminalCompletions } from './schemeTerminalCompletion';
import { extractSchemeCompletionPrefix } from './schemeTerminalInputLine';
import {
  extractSchemeTopLevelSymbols,
  mergeSchemeTerminalSymbols,
} from './schemeTerminalSymbolTracker';

export type SchemeEnvSymbolsGetter = () => readonly string[];

export function resolveSchemeEditorEnvSymbols(
  source: string,
  extraEnvSymbols: readonly string[],
): string[] {
  return mergeSchemeTerminalSymbols(
    extraEnvSymbols,
    extractSchemeTopLevelSymbols(source),
  );
}

export function buildSchemeEditorCompletionResult(args: {
  doc: string;
  pos: number;
  explicit?: boolean;
  envSymbols?: readonly string[];
}): { from: number; options: Completion[] } | null {
  const { doc, pos, explicit = false, envSymbols = [] } = args;
  const lineStart = doc.lastIndexOf('\n', Math.max(0, pos - 1)) + 1;
  const lineEnd = doc.indexOf('\n', pos);
  const lineText = doc.slice(lineStart, lineEnd === -1 ? doc.length : lineEnd);
  const cursorColInLine = pos - lineStart;
  const { prefix, startCol } = extractSchemeCompletionPrefix(
    lineText,
    cursorColInLine,
  );

  if (!prefix && !explicit) return null;
  if (prefix && !/[a-zA-Z]/.test(prefix)) return null;

  const mergedSymbols = resolveSchemeEditorEnvSymbols(doc, envSymbols);
  const matches = collectSchemeTerminalCompletions({
    prefix,
    envSymbols: mergedSymbols,
  });
  if (matches.length === 0) return null;

  const from = lineStart + startCol;
  if (from > pos) return null;

  const options: Completion[] = matches.map((match) => ({
    label: match.label,
    type: match.kind === 'keyword' ? 'keyword' : 'variable',
    boost: match.kind === 'keyword' ? 2 : 1,
  }));

  return { from, options };
}

export function schemeCompletionSource(
  getEnvSymbols: SchemeEnvSymbolsGetter,
): (context: CompletionContext) => CompletionResult | null {
  return (context) => {
    const result = buildSchemeEditorCompletionResult({
      doc: context.state.doc.toString(),
      pos: context.pos,
      explicit: context.explicit,
      envSymbols: getEnvSymbols(),
    });
    if (!result) return null;
    return {
      ...result,
      validFor: /^[^\s()[\]{}"'`;,|#@]*$/,
    };
  };
}

export function buildSchemeEditorCompletionExtension(
  getEnvSymbols: SchemeEnvSymbolsGetter = () => [],
): Extension {
  return autocompletion({
    activateOnTyping: true,
    override: [schemeCompletionSource(getEnvSymbols)],
  });
}
