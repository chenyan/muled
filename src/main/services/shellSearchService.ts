import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import path from 'path';
import { getShellProcessEnv } from '../shellPath';
import type { ToolPathsConfig } from '../../shared/types/tools';
import { resolveToolPaths } from './toolPathService';
import { toWorkspaceRelativePath } from '../../shared/pathUtils';
import type {
  FdSearchMatch,
  RgSearchMatch,
  ShellSearchError,
  ShellSearchMatch,
} from '../../shared/types/search';

const MAX_MATCHES = 100;

function installHint(command: 'rg' | 'fd'): string {
  if (process.platform === 'win32') {
    return command === 'rg'
      ? '未安装 ripgrep。安装: winget install BurntSushi.ripgrep.MSVC 或 scoop install ripgrep'
      : '未安装 fd。安装: winget install sharkdp.fd 或 scoop install fd';
  }
  if (process.platform === 'linux') {
    return command === 'rg'
      ? '未安装 ripgrep。安装: sudo apt install ripgrep 或 cargo install ripgrep'
      : '未安装 fd。安装: sudo apt install fd-find 或 cargo install fd-find';
  }
  return command === 'rg'
    ? '未安装 ripgrep。安装: brew install ripgrep'
    : '未安装 fd。安装: brew install fd';
}

export function parseShellArgs(input: string): string[] {
  const args: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (quote) {
      if (ch === quote) {
        quote = null;
        continue;
      }
      current += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === ' ') {
      if (current) {
        args.push(current);
        current = '';
      }
      continue;
    }
    current += ch;
  }

  if (current) args.push(current);
  return args;
}

/** 是否像 glob（*.ts）；普通关键词（如中文）应走 fd 默认正则，不能用 --glob */
export function looksLikeGlobPattern(pattern: string): boolean {
  return /[*?[\]{}]/.test(pattern);
}

/** fd 命令行参数：含 * ? 等时用 --glob；否则与终端 `fd 关键词` 一致（正则） */
export function buildFdCommandArgs(
  query: string,
  maxResults = MAX_MATCHES,
): string[] {
  const parsed = parseShellArgs(query);
  const hasGlobFlag = parsed.includes('--glob') || parsed.includes('-g');
  const patternArgs = parsed.filter((arg) => !arg.startsWith('-'));
  const needsGlob =
    !hasGlobFlag &&
    patternArgs.some((pattern) => looksLikeGlobPattern(pattern));

  const flags: string[] = ['--max-results', String(maxResults)];
  if (needsGlob) {
    flags.unshift('--glob');
  }
  return [...flags, ...parsed];
}

class LineBuffer {
  private buffer = '';

  push(chunk: string, onLine: (line: string) => void): void {
    this.buffer += chunk;
    let newlineIndex = this.buffer.indexOf('\n');
    while (newlineIndex >= 0) {
      const line = this.buffer.slice(0, newlineIndex);
      this.buffer = this.buffer.slice(newlineIndex + 1);
      onLine(line);
      newlineIndex = this.buffer.indexOf('\n');
    }
  }

  flush(onLine: (line: string) => void): void {
    const tail = this.buffer.trim();
    this.buffer = '';
    if (tail) {
      onLine(tail);
    }
  }
}

export function parseRgJsonLine(
  line: string,
  workspaceRoot: string,
): RgSearchMatch | null {
  if (!line.trim()) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch {
    return null;
  }
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    (parsed as { type?: string }).type !== 'match'
  ) {
    return null;
  }

  const data = (parsed as { data?: Record<string, unknown> }).data;
  if (!data) return null;

  const pathText = (data.path as { text?: string } | undefined)?.text;
  const lineNumber = data.line_number;
  const lineText = (data.lines as { text?: string } | undefined)?.text ?? '';
  const submatches = data.submatches;
  if (
    typeof pathText !== 'string' ||
    typeof lineNumber !== 'number' ||
    !Array.isArray(submatches) ||
    submatches.length === 0
  ) {
    return null;
  }

  const first = submatches[0] as {
    start?: number;
    end?: number;
    match?: { text?: string };
  };
  if (
    typeof first.start !== 'number' ||
    typeof first.end !== 'number' ||
    typeof first.match?.text !== 'string'
  ) {
    return null;
  }

  const relativePath = toWorkspaceRelativePath(workspaceRoot, pathText);
  if (!relativePath) {
    return null;
  }

  const root = path.resolve(workspaceRoot);
  const absolutePath = path.isAbsolute(pathText)
    ? path.normalize(pathText)
    : path.resolve(root, pathText);

  return {
    kind: 'rg',
    path: relativePath,
    absolutePath,
    line: lineNumber,
    column: first.start,
    length: first.end - first.start,
    lineText: lineText.replace(/\n$/, ''),
    matchText: first.match.text,
  };
}

export function parseRgJsonLines(
  output: string,
  workspaceRoot: string,
): RgSearchMatch[] {
  const matches: RgSearchMatch[] = [];
  output.split('\n').forEach((line) => {
    const match = parseRgJsonLine(line, workspaceRoot);
    if (match) {
      matches.push(match);
    }
  });
  return matches;
}

function parseFdLine(
  line: string,
  workspaceRoot: string,
): FdSearchMatch | null {
  const filePath = line.trim().replace(/^\.\//, '');
  if (!filePath) return null;
  const root = path.resolve(workspaceRoot);
  const absolutePath = path.isAbsolute(filePath)
    ? path.normalize(filePath)
    : path.normalize(path.join(root, filePath));
  const relativePath = toWorkspaceRelativePath(workspaceRoot, absolutePath);
  if (!relativePath) {
    return null;
  }
  return {
    kind: 'fd',
    path: relativePath,
    absolutePath,
  };
}

export interface SearchStreamEmitter {
  onMatch: (match: ShellSearchMatch) => void;
  onError: (error: ShellSearchError) => void;
  onDone: () => void;
}

export interface RunningSearch {
  proc: ChildProcessWithoutNullStreams;
  kill: () => void;
}

function streamProcessLines(
  proc: ChildProcessWithoutNullStreams,
  emit: SearchStreamEmitter,
  onLine: (line: string) => ShellSearchMatch | null,
  options?: { reportStderrWhenPresent?: boolean },
): RunningSearch {
  const killed = { value: false };
  const lineBuffer = new LineBuffer();
  let matchCount = 0;
  let stderr = '';
  let doneSent = false;

  const complete = () => {
    if (doneSent) return;
    doneSent = true;
    emit.onDone();
  };

  const kill = () => {
    if (killed.value) return;
    killed.value = true;
    proc.kill();
  };

  const handleLine = (line: string) => {
    if (killed.value || matchCount >= MAX_MATCHES) {
      return;
    }
    const match = onLine(line);
    if (!match) {
      return;
    }
    matchCount += 1;
    emit.onMatch(match);
    if (matchCount >= MAX_MATCHES) {
      kill();
    }
  };

  proc.stdout.on('data', (chunk: Buffer | string) => {
    lineBuffer.push(chunk.toString(), handleLine);
  });

  proc.stderr.on('data', (chunk: Buffer | string) => {
    stderr += chunk.toString();
  });

  proc.on('error', (err) => {
    if (doneSent) return;
    killed.value = true;
    emit.onError({
      code: 'failed',
      message: err instanceof Error ? err.message : String(err),
    });
    complete();
  });

  proc.on('close', (code) => {
    if (!killed.value) {
      lineBuffer.flush(handleLine);
      const stderrTrim = stderr.trim();
      const reportStderr =
        stderrTrim.length > 0 &&
        (options?.reportStderrWhenPresent === true ||
          (code !== 0 && code !== 1 && code !== null));
      if (reportStderr) {
        emit.onError({ code: 'failed', message: stderrTrim });
      }
    }
    complete();
  });

  return { proc, kill };
}

export async function streamRgSearch(
  workspaceRoot: string,
  query: string,
  emit: SearchStreamEmitter,
  toolPaths: ToolPathsConfig,
): Promise<RunningSearch | ShellSearchError> {
  const args = parseShellArgs(query);
  if (args.length === 0) {
    return { code: 'empty_query' };
  }
  const resolved = resolveToolPaths(toolPaths);
  if (!resolved.rg) {
    return { code: 'not_installed', command: 'rg', hint: installHint('rg') };
  }

  const proc = spawn(
    resolved.rg,
    ['--json', '--max-count', String(MAX_MATCHES), ...args, '.'],
    { cwd: workspaceRoot, env: getShellProcessEnv() },
  );

  return streamProcessLines(proc, emit, (line) =>
    parseRgJsonLine(line, workspaceRoot),
  );
}

export async function streamFdSearch(
  workspaceRoot: string,
  query: string,
  emit: SearchStreamEmitter,
  toolPaths: ToolPathsConfig,
): Promise<RunningSearch | ShellSearchError> {
  if (parseShellArgs(query).length === 0) {
    return { code: 'empty_query' };
  }
  const resolved = resolveToolPaths(toolPaths);
  if (!resolved.fd) {
    return { code: 'not_installed', command: 'fd', hint: installHint('fd') };
  }

  const proc = spawn(resolved.fd, buildFdCommandArgs(query), {
    cwd: workspaceRoot,
    env: getShellProcessEnv(),
  });

  return streamProcessLines(
    proc,
    emit,
    (line) => parseFdLine(line, workspaceRoot),
    { reportStderrWhenPresent: true },
  );
}
