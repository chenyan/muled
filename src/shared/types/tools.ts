/** 命令面板 fd / ripgrep / Chez Scheme / Bun / Python 可执行文件路径；留空表示在 PATH 中自动查找 */
export interface ToolPathsConfig {
  fd: string;
  rg: string;
  chez: string;
  bun: string;
  python: string;
  ipython: string;
}

export const DEFAULT_TOOL_PATHS: ToolPathsConfig = {
  fd: '',
  rg: '',
  chez: '',
  bun: '',
  python: '',
  ipython: '',
};

export type ShellToolId = keyof ToolPathsConfig;

export function parseToolPaths(raw: unknown): ToolPathsConfig {
  const data = (raw && typeof raw === 'object' ? raw : {}) as Record<
    string,
    unknown
  >;
  return {
    fd: typeof data.fd === 'string' ? data.fd.trim() : '',
    rg: typeof data.rg === 'string' ? data.rg.trim() : '',
    chez: typeof data.chez === 'string' ? data.chez.trim() : '',
    bun: typeof data.bun === 'string' ? data.bun.trim() : '',
    python: typeof data.python === 'string' ? data.python.trim() : '',
    ipython: typeof data.ipython === 'string' ? data.ipython.trim() : '',
  };
}

/** 在 PATH 上尝试的可执行文件名（按优先级） */
export function shellToolPathNames(
  tool: ShellToolId,
  platform: NodeJS.Platform = process.platform,
): string[] {
  if (tool === 'rg') {
    return platform === 'win32' ? ['rg.exe', 'rg'] : ['rg'];
  }
  if (tool === 'chez') {
    if (platform === 'win32') {
      return ['chez.exe', 'chez', 'scheme.exe', 'scheme', 'petite.exe', 'petite'];
    }
    return ['chez', 'scheme', 'petite'];
  }
  if (tool === 'bun') {
    return platform === 'win32' ? ['bun.exe', 'bun'] : ['bun'];
  }
  if (tool === 'python') {
    return platform === 'win32'
      ? ['python.exe', 'python3.exe', 'python', 'python3']
      : ['python3', 'python'];
  }
  if (tool === 'ipython') {
    return platform === 'win32'
      ? ['ipython.exe', 'ipython3.exe', 'ipython', 'ipython3']
      : ['ipython3', 'ipython'];
  }
  if (platform === 'linux') {
    return ['fdfind', 'fd'];
  }
  if (platform === 'win32') {
    return ['fd.exe', 'fd'];
  }
  return ['fd'];
}

export interface DetectToolsResult {
  tools: ToolPathsConfig;
  found: Record<ShellToolId, boolean>;
}

export interface SchemeRunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export type SchemeRunResponse =
  | { error: 'not_configured' }
  | ({ ok: true } & SchemeRunResult);

export type SchemePtyCreateResponse =
  | { error: 'not_configured' }
  | { error: 'spawn_failed'; message: string }
  | { ok: true; sessionId: string };

export interface SchemePtyDataPayload {
  sessionId: string;
  data: string;
}

export interface SchemePtyExitPayload {
  sessionId: string;
  exitCode: number;
}

export type BunRunResult = SchemeRunResult;

export type BunRunResponse =
  | { error: 'not_configured' }
  | ({ ok: true } & BunRunResult);

export type BunPtyCreateResponse = SchemePtyCreateResponse;

export interface BunPtyDataPayload {
  sessionId: string;
  data: string;
}

export interface BunPtyExitPayload {
  sessionId: string;
  exitCode: number;
}

export type PythonPtyMode = 'script' | 'repl';

export type PythonPtyCreateResponse =
  | { error: 'not_configured' }
  | { error: 'ipython_not_available'; message: string }
  | { error: 'spawn_failed'; message: string }
  | { ok: true; sessionId: string };

export interface PythonPtyDataPayload {
  sessionId: string;
  data: string;
}

export interface PythonPtyExitPayload {
  sessionId: string;
  exitCode: number;
}
