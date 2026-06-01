import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { expandTilde } from '../../shared/pathUtils';
import {
  type DetectToolsResult,
  type ShellToolId,
  type ToolPathsConfig,
  shellToolPathNames,
} from '../../shared/types/tools';
import { getShellProcessEnv } from '../shellPath';

function isExecutableFile(filePath: string): boolean {
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) {
      return false;
    }
    if (process.platform === 'win32') {
      return true;
    }
    fs.accessSync(filePath, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function whichOnPath(name: string, env: NodeJS.ProcessEnv): string | null {
  const checker = process.platform === 'win32' ? 'where' : 'which';
  const result = spawnSync(checker, [name], {
    env,
    encoding: 'utf8',
    timeout: 5000,
  });
  if (result.status !== 0) {
    return null;
  }
  const line = result.stdout
    .toString()
    .trim()
    .split(/\r?\n/)
    .find((entry) => entry.trim().length > 0);
  if (!line) {
    return null;
  }
  const resolved = line.trim();
  return isExecutableFile(resolved) ? path.normalize(resolved) : null;
}

function platformCandidatePaths(tool: ShellToolId): string[] {
  const home = os.homedir();
  const names = shellToolPathNames(tool);

  if (process.platform === 'win32') {
    const dirs = [
      path.join(home, 'scoop', 'shims'),
      path.join(home, 'AppData', 'Local', 'Microsoft', 'WinGet', 'Links'),
      path.join(home, '.cargo', 'bin'),
      'C:\\Program Files\\ripgrep',
      'C:\\Program Files\\fd',
    ];
    return dirs.flatMap((dir) => names.map((name) => path.join(dir, name)));
  }

  if (process.platform === 'linux') {
    const dirs = [
      '/usr/bin',
      '/usr/local/bin',
      '/snap/bin',
      path.join(home, '.local', 'bin'),
      path.join(home, '.cargo', 'bin'),
    ];
    return dirs.flatMap((dir) => names.map((name) => path.join(dir, name)));
  }

  const dirs = [
    '/opt/homebrew/bin',
    '/usr/local/bin',
    '/usr/bin',
    path.join(home, '.local', 'bin'),
    path.join(home, '.cargo', 'bin'),
  ];
  return dirs.flatMap((dir) => names.map((name) => path.join(dir, name)));
}

export function detectToolPath(
  tool: ShellToolId,
  env: NodeJS.ProcessEnv = getShellProcessEnv(),
): string | null {
  for (const name of shellToolPathNames(tool)) {
    const found = whichOnPath(name, env);
    if (found) {
      return found;
    }
  }
  for (const candidate of platformCandidatePaths(tool)) {
    if (isExecutableFile(candidate)) {
      return path.normalize(candidate);
    }
  }
  return null;
}

export function detectToolPaths(
  env: NodeJS.ProcessEnv = getShellProcessEnv(),
): DetectToolsResult {
  const fd = detectToolPath('fd', env);
  const rg = detectToolPath('rg', env);
  return {
    tools: {
      fd: fd ?? '',
      rg: rg ?? '',
    },
    found: {
      fd: fd !== null,
      rg: rg !== null,
    },
  };
}

export function resolveToolExecutable(
  tool: ShellToolId,
  configured: string,
  env: NodeJS.ProcessEnv = getShellProcessEnv(),
): string | null {
  const trimmed = configured.trim();
  if (trimmed) {
    const expanded = expandTilde(trimmed);
    return isExecutableFile(expanded) ? path.normalize(expanded) : null;
  }
  return detectToolPath(tool, env);
}

export function resolveToolPaths(
  config: ToolPathsConfig,
  env: NodeJS.ProcessEnv = getShellProcessEnv(),
): { fd: string | null; rg: string | null } {
  return {
    fd: resolveToolExecutable('fd', config.fd, env),
    rg: resolveToolExecutable('rg', config.rg, env),
  };
}
