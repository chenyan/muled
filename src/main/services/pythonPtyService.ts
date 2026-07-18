import { randomUUID } from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { IPty } from 'node-pty';
import * as pty from 'node-pty';
import type { WebContents } from 'electron';
import type { PythonPtyMode } from '../../shared/types/tools';
import { describePtySpawnFailure, sanitizeSpawnEnv } from '../ptySpawn';
import { getShellProcessEnv } from '../shellPath';
import type { IpythonLaunch } from './toolPathService';
import { stripPtyAnsi } from './bunPtyService';

interface PtySession {
  proc: IPty;
  tmpDir?: string;
  mode: PythonPtyMode;
  loadPath: string | null;
  loadSent: boolean;
  replOutputBuffer: string;
  webContents: WebContents;
  rendererAttached: boolean;
  pendingOutput: string[];
}

const sessions = new Map<string, PtySession>();
const webContentsSessionIds = new Map<number, Set<string>>();

export function ipythonLoadCommand(absolutePath: string): string {
  const normalized = absolutePath.replace(/\\/g, '/');
  const escaped = normalized.replace(/'/g, "\\'");
  return `%run '${escaped}'\r`;
}

export function isIpythonPromptReady(buffer: string): boolean {
  const plain = stripPtyAnsi(buffer).slice(-256);
  return (
    /(?:^|\r?\n)In \[\d+\]:\s*$/.test(plain) ||
    /(?:^|\r?\n)>>> \s*$/.test(plain)
  );
}

function forwardPtyData(sessionId: string, session: PtySession, data: string): void {
  if (session.webContents.isDestroyed()) return;

  if (!session.rendererAttached) {
    session.pendingOutput.push(data);
    return;
  }

  session.webContents.send('python:pty:data', { sessionId, data });
}

function attachPythonPtyRenderer(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (!session || session.rendererAttached) return;

  session.rendererAttached = true;
  if (session.webContents.isDestroyed()) {
    session.pendingOutput = [];
    return;
  }

  for (const chunk of session.pendingOutput) {
    session.webContents.send('python:pty:data', { sessionId, data: chunk });
  }
  session.pendingOutput = [];
}

function trackSessionWebContents(
  sessionId: string,
  webContents: WebContents,
): void {
  const wcId = webContents.id;
  let ids = webContentsSessionIds.get(wcId);
  if (!ids) {
    ids = new Set();
    webContentsSessionIds.set(wcId, ids);
    webContents.once('destroyed', () => {
      const sessionIds = [...ids!];
      webContentsSessionIds.delete(wcId);
      for (const trackedSessionId of sessionIds) {
        killPythonPtySession(trackedSessionId);
      }
    });
  }
  ids.add(sessionId);
}

function untrackSessionWebContents(
  sessionId: string,
  webContents: WebContents,
): void {
  const ids = webContentsSessionIds.get(webContents.id);
  if (!ids) return;
  ids.delete(sessionId);
  if (ids.size === 0) {
    webContentsSessionIds.delete(webContents.id);
  }
}

function prepareRunTarget(
  args: { path?: string; code?: string },
  resolveFilePath: (relative: string) => string,
): { cwd: string; scriptPath: string | null; tmpDir?: string } {
  if (args.path) {
    const absolutePath = resolveFilePath(args.path);
    return {
      cwd: path.dirname(absolutePath),
      scriptPath: absolutePath,
    };
  }
  if (typeof args.code === 'string') {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'muled-python-pty-'));
    const scriptPath = path.join(tmpDir, 'session.py');
    fs.writeFileSync(scriptPath, args.code, 'utf8');
    return {
      cwd: tmpDir,
      scriptPath,
      tmpDir,
    };
  }
  return { cwd: process.cwd(), scriptPath: null };
}

function cleanupSession(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (!session) return;
  sessions.delete(sessionId);
  untrackSessionWebContents(sessionId, session.webContents);
  if (session.tmpDir) {
    try {
      fs.rmSync(session.tmpDir, { recursive: true, force: true });
    } catch {
      // ignore temp cleanup failures
    }
  }
}

function trySendPendingLoad(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (
    !session ||
    session.mode !== 'repl' ||
    session.loadSent ||
    !session.loadPath ||
    !session.rendererAttached
  ) {
    return;
  }
  if (!isIpythonPromptReady(session.replOutputBuffer)) {
    return;
  }
  session.loadSent = true;
  session.proc.write(ipythonLoadCommand(session.loadPath));
}

export function createPythonPtySession(
  mode: PythonPtyMode,
  pythonExecutable: string,
  ipythonLaunch: IpythonLaunch | null,
  args: {
    path?: string;
    code?: string;
    cols: number;
    rows: number;
  },
  resolveFilePath: (relative: string) => string,
  webContents: WebContents,
):
  | { ok: true; sessionId: string }
  | { error: 'ipython_not_available'; message: string }
  | { error: 'spawn_failed'; message: string } {
  if (mode === 'repl' && !ipythonLaunch) {
    return {
      error: 'ipython_not_available',
      message: '未找到 IPython。请安装 IPython 或在设置中配置 ipython 路径。',
    };
  }

  const sessionId = randomUUID();
  const { cwd, scriptPath, tmpDir } = prepareRunTarget(args, resolveFilePath);
  if (!scriptPath) {
    return { error: 'spawn_failed', message: '没有可运行的 Python 内容' };
  }

  const spawn =
    mode === 'script'
      ? { executable: pythonExecutable, argv: [scriptPath] }
      : {
          executable: ipythonLaunch!.executable,
          argv: [...ipythonLaunch!.args],
        };

  try {
    const proc = pty.spawn(spawn.executable, spawn.argv, {
      name: 'xterm-256color',
      cols: Math.max(2, args.cols),
      rows: Math.max(1, args.rows),
      cwd,
      env: sanitizeSpawnEnv(getShellProcessEnv()),
    });

    sessions.set(sessionId, {
      proc,
      tmpDir,
      mode,
      loadPath: mode === 'repl' ? scriptPath : null,
      loadSent: false,
      replOutputBuffer: '',
      webContents,
      rendererAttached: false,
      pendingOutput: [],
    });
    trackSessionWebContents(sessionId, webContents);

    proc.onData((data) => {
      const session = sessions.get(sessionId);
      if (!session) return;
      if (session.mode === 'repl') {
        session.replOutputBuffer += data;
        if (session.replOutputBuffer.length > 4096) {
          session.replOutputBuffer = session.replOutputBuffer.slice(-4096);
        }
        trySendPendingLoad(sessionId);
      }
      forwardPtyData(sessionId, session, data);
    });

    proc.onExit(({ exitCode }) => {
      cleanupSession(sessionId);
      if (webContents.isDestroyed()) return;
      webContents.send('python:pty:exit', { sessionId, exitCode });
    });

    return { ok: true, sessionId };
  } catch (error) {
    if (tmpDir) {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
    const message = describePtySpawnFailure(
      error instanceof Error ? error.message : String(error),
    );
    return { error: 'spawn_failed', message };
  }
}

export function writePythonPtySession(sessionId: string, data: string): boolean {
  const session = sessions.get(sessionId);
  if (!session) return false;
  session.proc.write(data);
  return true;
}

export function resizePythonPtySession(
  sessionId: string,
  cols: number,
  rows: number,
): boolean {
  const session = sessions.get(sessionId);
  if (!session) return false;
  session.proc.resize(Math.max(2, cols), Math.max(1, rows));
  attachPythonPtyRenderer(sessionId);
  trySendPendingLoad(sessionId);
  return true;
}

export function killPythonPtySession(sessionId: string): boolean {
  const session = sessions.get(sessionId);
  if (!session) return false;
  try {
    session.proc.kill();
  } catch {
    // ignore kill failures
  }
  cleanupSession(sessionId);
  return true;
}

export function killAllPythonPtySessions(): void {
  [...sessions.keys()].forEach((sessionId) => {
    killPythonPtySession(sessionId);
  });
}
