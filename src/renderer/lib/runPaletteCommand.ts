import type { EditorMode } from '../../shared/types/config';
import {
  applyVimSubstitute,
  parseCdCommand,
  parseVimSubstituteCommand,
} from './vimSubstitute';

export type PaletteCommandResult =
  | { ok: true; kind: 'cd'; path: string }
  | { ok: true; kind: 'substitute'; content: string }
  | { ok: true; kind: 'mode'; mode: EditorMode }
  | { ok: false; error: string };

function resolveSubstituteRange(
  content: string,
  selection: { from: number; to: number } | null,
): { from: number; to: number } {
  if (selection && selection.from < selection.to) {
    const from = Math.max(0, Math.min(selection.from, content.length));
    const to = Math.max(from, Math.min(selection.to, content.length));
    return { from, to };
  }
  return { from: 0, to: content.length };
}

export function runPaletteCommand(
  input: string,
  context: {
    tabContent: string;
    selection: { from: number; to: number } | null;
  },
): PaletteCommandResult {
  const line = input.trim();
  if (!line) {
    return { ok: false, error: '请输入命令' };
  }

  if (line === 'mode normal' || line === 'mode vim') {
    return {
      ok: true,
      kind: 'mode',
      mode: line === 'mode normal' ? 'normal' : 'vim',
    };
  }
  if (line === 'mode' || line.startsWith('mode ')) {
    return { ok: false, error: '用法: mode normal | mode vim' };
  }

  const cd = parseCdCommand(line);
  if (cd.ok) {
    return { ok: true, kind: 'cd', path: cd.path };
  }
  if (line === 'cd' || line.startsWith('cd ')) {
    return { ok: false, error: cd.error };
  }

  const sub = parseVimSubstituteCommand(line);
  if (sub.ok) {
    try {
      const { from, to } = resolveSubstituteRange(
        context.tabContent,
        context.selection,
      );
      const slice = context.tabContent.slice(from, to);
      const replaced = applyVimSubstitute(slice, sub.spec);
      const content =
        context.tabContent.slice(0, from) +
        replaced +
        context.tabContent.slice(to);
      return { ok: true, kind: 'substitute', content };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return { ok: false, error: message };
    }
  }
  if (line.startsWith('s') || line.startsWith(':s') || line.startsWith('%s')) {
    return { ok: false, error: sub.error };
  }

  const head = line.split(/\s+/)[0] ?? line;
  return { ok: false, error: `未知命令: ${head}` };
}
