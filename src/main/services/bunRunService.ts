import { type ChildProcess, spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { WebContents } from 'electron';
import type { BunRunResult } from '../../shared/types/tools';
import { getShellProcessEnv } from '../shellPath';

const RUN_TIMEOUT_MS = 30_000;

interface ActiveRun {
  proc: ChildProcess;
  tmpDir?: string;
  timedOut: { value: boolean };
  aborted: { value: boolean };
}

const activeRunsByWebContents = new Map<number, ActiveRun>();

function cleanupTmpDir(tmpDir?: string): void {
  if (!tmpDir) return;
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    // ignore temp cleanup failures
  }
}

function collectSpawnResult(
  proc: ChildProcess,
  options: {
    webContentsId?: number;
    tmpDir?: string;
    timedOut: { value: boolean };
    aborted: { value: boolean };
  },
): Promise<BunRunResult> {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';

    proc.stdout?.setEncoding('utf8');
    proc.stderr?.setEncoding('utf8');
    proc.stdout?.on('data', (chunk: string) => {
      stdout += chunk;
    });
    proc.stderr?.on('data', (chunk: string) => {
      stderr += chunk;
    });

    const timeout = setTimeout(() => {
      options.timedOut.value = true;
      proc.kill('SIGTERM');
      setTimeout(() => {
        if (!proc.killed) {
          proc.kill('SIGKILL');
        }
      }, 250);
    }, RUN_TIMEOUT_MS);

    proc.on('error', (error) => {
      clearTimeout(timeout);
      if (options.webContentsId !== undefined) {
        activeRunsByWebContents.delete(options.webContentsId);
      }
      cleanupTmpDir(options.tmpDir);
      resolve({
        stdout,
        stderr: stderr || error.message,
        exitCode: 1,
      });
    });

    proc.on('close', (exitCode) => {
      clearTimeout(timeout);
      if (options.webContentsId !== undefined) {
        activeRunsByWebContents.delete(options.webContentsId);
      }
      cleanupTmpDir(options.tmpDir);

      if (options.aborted.value) {
        resolve({
          stdout,
          stderr: [stderr, '[已中断]'].filter(Boolean).join('\n'),
          exitCode: 130,
        });
        return;
      }

      if (options.timedOut.value) {
        resolve({
          stdout,
          stderr: [stderr, `[运行超时（${RUN_TIMEOUT_MS / 1000}s）已终止]`]
            .filter(Boolean)
            .join('\n'),
          exitCode: 124,
        });
        return;
      }

      resolve({
        stdout,
        stderr,
        exitCode: exitCode ?? 0,
      });
    });
  });
}

function spawnBunScript(
  bunExecutable: string,
  scriptPath: string,
  cwd: string,
  webContentsId?: number,
): Promise<BunRunResult> {
  if (webContentsId !== undefined) {
    abortBunRun(webContentsId);
  }

  const proc = spawn(bunExecutable, [scriptPath], {
    env: getShellProcessEnv(),
    cwd,
  });

  const timedOut = { value: false };
  const aborted = { value: false };

  if (webContentsId !== undefined) {
    activeRunsByWebContents.set(webContentsId, { proc, timedOut, aborted });
  }

  return collectSpawnResult(proc, { webContentsId, timedOut, aborted });
}

export function abortBunRun(webContentsId: number): boolean {
  const active = activeRunsByWebContents.get(webContentsId);
  if (!active) return false;
  active.aborted.value = true;
  activeRunsByWebContents.delete(webContentsId);
  try {
    active.proc.kill('SIGTERM');
    setTimeout(() => {
      if (!active.proc.killed) {
        active.proc.kill('SIGKILL');
      }
    }, 250);
  } catch {
    // ignore kill failures
  }
  cleanupTmpDir(active.tmpDir);
  return true;
}

export function abortBunRunForWebContents(webContents: WebContents): boolean {
  if (webContents.isDestroyed()) return false;
  return abortBunRun(webContents.id);
}

export function bunScriptExtension(language?: string): 'js' | 'ts' {
  const key = (language ?? '').trim().toLowerCase();
  if (key === 'typescript' || key === 'ts' || key === 'tsx') {
    return 'ts';
  }
  return 'js';
}

export function runBunScript(
  bunExecutable: string,
  code: string,
  language?: string,
  webContentsId?: number,
): Promise<BunRunResult> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'muled-bun-'));
  const ext = bunScriptExtension(language);
  const scriptPath = path.join(tmpDir, `block.${ext}`);
  fs.writeFileSync(scriptPath, code, 'utf8');

  if (webContentsId !== undefined) {
    abortBunRun(webContentsId);
  }

  const proc = spawn(bunExecutable, [scriptPath], {
    env: getShellProcessEnv(),
    cwd: tmpDir,
  });

  const timedOut = { value: false };
  const aborted = { value: false };

  if (webContentsId !== undefined) {
    activeRunsByWebContents.set(webContentsId, {
      proc,
      tmpDir,
      timedOut,
      aborted,
    });
  }

  return collectSpawnResult(proc, {
    webContentsId,
    tmpDir,
    timedOut,
    aborted,
  });
}

export function runBunFile(
  bunExecutable: string,
  scriptPath: string,
  webContentsId?: number,
): Promise<BunRunResult> {
  return spawnBunScript(
    bunExecutable,
    scriptPath,
    path.dirname(scriptPath),
    webContentsId,
  );
}
