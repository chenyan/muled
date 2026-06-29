import { randomUUID } from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { IPty } from 'node-pty';
import * as pty from 'node-pty';
import type { WebContents } from 'electron';
import { describePtySpawnFailure, sanitizeSpawnEnv } from '../ptySpawn';
import { getShellProcessEnv } from '../shellPath';
import { bunScriptExtension } from './bunRunService';

interface PtySession {
  proc: IPty;
  tmpDir?: string;
  loadPath: string | null;
  loadSent: boolean;
  replOutputBuffer: string;
  webContents: WebContents;
  rendererAttached: boolean;
  pendingOutput: string[];
}

const sessions = new Map<string, PtySession>();
const webContentsSessionIds = new Map<number, Set<string>>();

function forwardPtyData(sessionId: string, session: PtySession, data: string): void {
  if (session.webContents.isDestroyed()) return;

  if (!session.rendererAttached) {
    session.pendingOutput.push(data);
    return;
  }

  session.webContents.send('bun:pty:data', { sessionId, data });
}

function attachBunPtyRenderer(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (!session || session.rendererAttached) return;

  session.rendererAttached = true;
  if (session.webContents.isDestroyed()) {
    session.pendingOutput = [];
    return;
  }

  for (const chunk of session.pendingOutput) {
    session.webContents.send('bun:pty:data', { sessionId, data: chunk });
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
        killBunPtySession(trackedSessionId);
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

export function stripPtyAnsi(text: string): string {
  return text.replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, '');
}

export function isBunReplPromptReady(buffer: string): boolean {
  const plain = stripPtyAnsi(buffer).slice(-128);
  return /(?:^|\r?\n)>\s*$/.test(plain);
}

export function bunPtySpawnArgv(): string[] {
  return ['repl'];
}

export function bunLoadCommand(absolutePath: string): string {
  const base = path
    .basename(absolutePath)
    .replace(/\\/g, '/')
    .replace(/'/g, "\\'");
  return `void Object.assign(globalThis, await import('./${base}'))\r`;
}

/** @deprecated Use bunPtySpawnArgv; PTY sessions always enter `bun repl`. */
export function bunRunArgv(loadPath: string | null): string[] {
  void loadPath;
  return bunPtySpawnArgv();
}

function trySendPendingLoad(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (!session || session.loadSent || !session.loadPath || !session.rendererAttached) {
    return;
  }
  if (!isBunReplPromptReady(session.replOutputBuffer)) {
    return;
  }
  session.loadSent = true;
  session.proc.write(bunLoadCommand(session.loadPath));
}

function prepareLoadTarget(
  args: { path?: string; code?: string; language?: string },
  resolveFilePath: (relative: string) => string,
): { cwd: string; loadPath: string | null; tmpDir?: string } {
  if (args.path) {
    const absolutePath = resolveFilePath(args.path);
    return {
      cwd: path.dirname(absolutePath),
      loadPath: absolutePath,
    };
  }
  if (typeof args.code === 'string') {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'muled-bun-pty-'));
    const ext = bunScriptExtension(args.language);
    const scriptPath = path.join(tmpDir, `session.${ext}`);
    fs.writeFileSync(scriptPath, args.code, 'utf8');
    return {
      cwd: tmpDir,
      loadPath: scriptPath,
      tmpDir,
    };
  }
  return { cwd: process.cwd(), loadPath: null };
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

export function createBunPtySession(
  bunExecutable: string,
  args: {
    path?: string;
    code?: string;
    language?: string;
    cols: number;
    rows: number;
  },
  resolveFilePath: (relative: string) => string,
  webContents: WebContents,
):
  | { ok: true; sessionId: string }
  | { error: 'spawn_failed'; message: string } {
  const sessionId = randomUUID();
  const { cwd, loadPath, tmpDir } = prepareLoadTarget(args, resolveFilePath);

  try {
    const proc = pty.spawn(bunExecutable, bunPtySpawnArgv(), {
      name: 'xterm-256color',
      cols: Math.max(2, args.cols),
      rows: Math.max(1, args.rows),
      cwd,
      env: sanitizeSpawnEnv(getShellProcessEnv()),
    });

    sessions.set(sessionId, {
      proc,
      tmpDir,
      loadPath,
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
      session.replOutputBuffer += data;
      if (session.replOutputBuffer.length > 4096) {
        session.replOutputBuffer = session.replOutputBuffer.slice(-4096);
      }
      trySendPendingLoad(sessionId);
      forwardPtyData(sessionId, session, data);
    });

    proc.onExit(({ exitCode }) => {
      cleanupSession(sessionId);
      if (webContents.isDestroyed()) return;
      webContents.send('bun:pty:exit', { sessionId, exitCode });
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

export function writeBunPtySession(sessionId: string, data: string): boolean {
  const session = sessions.get(sessionId);
  if (!session) return false;
  session.proc.write(data);
  return true;
}

export function resizeBunPtySession(
  sessionId: string,
  cols: number,
  rows: number,
): boolean {
  const session = sessions.get(sessionId);
  if (!session) return false;
  session.proc.resize(Math.max(2, cols), Math.max(1, rows));
  attachBunPtyRenderer(sessionId);
  trySendPendingLoad(sessionId);
  return true;
}

export function killBunPtySession(sessionId: string): boolean {
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

export function killAllBunPtySessions(): void {
  [...sessions.keys()].forEach((sessionId) => {
    killBunPtySession(sessionId);
  });
}
