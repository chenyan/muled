import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { SchemeRunResult } from '../../shared/types/tools';
import { getShellProcessEnv } from '../shellPath';

const RUN_TIMEOUT_MS = 30_000;

function spawnSchemeScript(
  chezExecutable: string,
  scriptPath: string,
  cwd?: string,
): SchemeRunResult {
  const result = spawnSync(chezExecutable, ['-q', '--script', scriptPath], {
    encoding: 'utf8',
    timeout: RUN_TIMEOUT_MS,
    env: getShellProcessEnv(),
    cwd,
  });
  if (result.error) {
    return {
      stdout: result.stdout ?? '',
      stderr: result.error.message,
      exitCode: 1,
    };
  }
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    exitCode: result.status ?? 0,
  };
}

export function runSchemeScript(
  chezExecutable: string,
  code: string,
): SchemeRunResult {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'muled-scheme-'));
  const scriptPath = path.join(tmpDir, 'block.scm');
  try {
    fs.writeFileSync(scriptPath, code, 'utf8');
    return spawnSchemeScript(chezExecutable, scriptPath);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

export function runSchemeFile(
  chezExecutable: string,
  scriptPath: string,
): SchemeRunResult {
  return spawnSchemeScript(chezExecutable, scriptPath, path.dirname(scriptPath));
}
