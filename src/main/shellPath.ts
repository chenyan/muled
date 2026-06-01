import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const pathKey = process.platform === 'win32' ? 'Path' : 'PATH';

const COMMON_UNIX_BIN_DIRS = [
  '/opt/homebrew/bin',
  '/opt/homebrew/sbin',
  '/usr/local/bin',
  '/usr/local/sbin',
  path.join(os.homedir(), '.local', 'bin'),
  path.join(os.homedir(), '.cargo', 'bin'),
  '/snap/bin',
];

const COMMON_WIN_BIN_DIRS = [
  path.join(os.homedir(), 'scoop', 'shims'),
  path.join(os.homedir(), '.cargo', 'bin'),
];

function pathSeparator(): string {
  return process.platform === 'win32' ? ';' : ':';
}

function splitPath(pathValue: string): string[] {
  return pathValue.split(pathSeparator()).filter(Boolean);
}

function existingDirs(dirs: string[]): string[] {
  return dirs.filter((dir) => {
    try {
      return fs.existsSync(dir);
    } catch {
      return false;
    }
  });
}

/** 将常见 CLI 安装目录前置到 PATH（Homebrew、~/.local/bin 等） */
export function prependCommonBinDirs(pathValue: string): string {
  const dirs =
    process.platform === 'win32' ? COMMON_WIN_BIN_DIRS : COMMON_UNIX_BIN_DIRS;
  const sep = pathSeparator();
  const seen = new Set(splitPath(pathValue));
  const toPrepend = existingDirs(dirs).filter((dir) => !seen.has(dir));
  if (toPrepend.length === 0) {
    return pathValue;
  }
  return [...toPrepend, ...splitPath(pathValue)].join(sep);
}

function pathLooksLikeLoginShell(pathValue: string): boolean {
  if (process.platform === 'darwin') {
    return (
      pathValue.includes('/opt/homebrew') || pathValue.includes('/usr/local/bin')
    );
  }
  if (process.platform === 'linux') {
    return (
      pathValue.includes('/.local/bin') || pathValue.includes('/snap/bin')
    );
  }
  return true;
}

/** macOS/Linux GUI 启动时从登录 shell 读取 PATH（与终端一致） */
export function readLoginShellPath(): string | null {
  if (process.platform === 'win32') {
    return null;
  }
  const shell = process.env.SHELL;
  if (!shell) {
    return null;
  }
  try {
    const output = execFileSync(shell, ['-ilc', 'echo -n "$PATH"'], {
      encoding: 'utf8',
      timeout: 5000,
      env: { ...process.env, TERM: 'dumb' },
    });
    const trimmed = output.trim();
    return trimmed || null;
  } catch {
    return null;
  }
}

function mergePathLists(primary: string, fallback: string): string {
  const sep = pathSeparator();
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const dir of [...splitPath(primary), ...splitPath(fallback)]) {
    if (seen.has(dir)) continue;
    seen.add(dir);
    merged.push(dir);
  }
  return merged.join(sep);
}

let cachedShellEnv: NodeJS.ProcessEnv | null = null;

export function buildShellProcessEnv(
  baseEnv: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  const env = { ...baseEnv };
  let pathValue = env[pathKey] ?? '';
  pathValue = prependCommonBinDirs(pathValue);

  if (!pathLooksLikeLoginShell(pathValue)) {
    const loginPath = readLoginShellPath();
    if (loginPath) {
      pathValue = mergePathLists(loginPath, pathValue);
    }
  }

  env[pathKey] = pathValue;
  return env;
}

export function getShellProcessEnv(): NodeJS.ProcessEnv {
  if (!cachedShellEnv) {
    cachedShellEnv = buildShellProcessEnv();
  }
  return cachedShellEnv;
}

/** 在 main 进程最早调用，使 spawn / which 能找到 brew 等安装的 CLI */
export function augmentShellPath(): void {
  const env = getShellProcessEnv();
  process.env[pathKey] = env[pathKey];
}
