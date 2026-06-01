/** 命令面板 fd / ripgrep 可执行文件路径；留空表示在 PATH 中自动查找 */
export interface ToolPathsConfig {
  fd: string;
  rg: string;
}

export const DEFAULT_TOOL_PATHS: ToolPathsConfig = {
  fd: '',
  rg: '',
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
