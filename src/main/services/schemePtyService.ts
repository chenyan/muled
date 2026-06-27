import { randomUUID } from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { IPty } from 'node-pty';
import * as pty from 'node-pty';
import type { WebContents } from 'electron';
import { describePtySpawnFailure, sanitizeSpawnEnv } from '../ptySpawn';
import { getShellProcessEnv } from '../shellPath';

interface PtySession {
  proc: IPty;
  tmpDir?: string;
  loadPath: string | null;
  loadSent: boolean;
  webContents: WebContents;
  rendererAttached: boolean;
  pendingOutput: string[];
  greetingStripped: boolean;
  greetingBuffer: string;
}

const CHEZ_GREETING_RE =
  /^Chez Scheme Version[^\r\n]*\r?\nCopyright[^\r\n]*\r?\n(?:\r?\n)?/;

function stripChezGreeting(session: PtySession, data: string): string {
  if (session.greetingStripped) return data;

  const combined = session.greetingBuffer + data;
  const match = combined.match(CHEZ_GREETING_RE);
  if (match) {
    session.greetingStripped = true;
    session.greetingBuffer = '';
    return combined.slice(match[0].length);
  }

  if (combined.startsWith('Chez Scheme Version') && combined.length < 256) {
    session.greetingBuffer = combined;
    return '';
  }

  session.greetingStripped = true;
  session.greetingBuffer = '';
  return combined;
}

function forwardPtyData(sessionId: string, session: PtySession, data: string): void {
  const payload = stripChezGreeting(session, data);
  if (!payload) return;

  if (session.webContents.isDestroyed()) return;

  if (!session.rendererAttached) {
    session.pendingOutput.push(payload);
    return;
  }

  session.webContents.send('scheme:pty:data', { sessionId, data: payload });
}

function attachSchemePtyRenderer(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (!session || session.rendererAttached) return;

  session.rendererAttached = true;
  if (session.webContents.isDestroyed()) {
    session.pendingOutput = [];
    return;
  }

  for (const chunk of session.pendingOutput) {
    session.webContents.send('scheme:pty:data', { sessionId, data: chunk });
  }
  session.pendingOutput = [];
}

const sessions = new Map<string, PtySession>();
const webContentsSessionIds = new Map<number, Set<string>>();

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
        killSchemePtySession(trackedSessionId);
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

export function schemeLoadCommand(absolutePath: string): string {
  const normalized = absolutePath.replace(/\\/g, '/');
  const escaped = normalized.replace(/"/g, '\\"');
  return `(load "${escaped}")\r`;
}

function prepareLoadTarget(
  args: { path?: string; code?: string },
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
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'muled-scheme-pty-'));
    const scriptPath = path.join(tmpDir, 'session.scm');
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

export function createSchemePtySession(
  chezExecutable: string,
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
  | { error: 'spawn_failed'; message: string } {
  const sessionId = randomUUID();
  const { cwd, loadPath, tmpDir } = prepareLoadTarget(args, resolveFilePath);

  try {
    const proc = pty.spawn(chezExecutable, [], {
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
      webContents,
      rendererAttached: false,
      pendingOutput: [],
      greetingStripped: false,
      greetingBuffer: '',
    });
    trackSessionWebContents(sessionId, webContents);

    proc.onData((data) => {
      const session = sessions.get(sessionId);
      if (!session) return;
      forwardPtyData(sessionId, session, data);
    });

    proc.onExit(({ exitCode }) => {
      cleanupSession(sessionId);
      if (webContents.isDestroyed()) return;
      webContents.send('scheme:pty:exit', { sessionId, exitCode });
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

export function writeSchemePtySession(sessionId: string, data: string): boolean {
  const session = sessions.get(sessionId);
  if (!session) return false;
  session.proc.write(data);
  return true;
}

function sendPendingLoad(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (!session || session.loadSent || !session.loadPath) return;
  session.loadSent = true;
  session.proc.write(schemeLoadCommand(session.loadPath));
}

export function resizeSchemePtySession(
  sessionId: string,
  cols: number,
  rows: number,
): boolean {
  const session = sessions.get(sessionId);
  if (!session) return false;
  session.proc.resize(Math.max(2, cols), Math.max(1, rows));
  attachSchemePtyRenderer(sessionId);
  sendPendingLoad(sessionId);
  return true;
}

export function killSchemePtySession(sessionId: string): boolean {
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

export function killAllSchemePtySessions(): void {
  [...sessions.keys()].forEach((sessionId) => {
    killSchemePtySession(sessionId);
  });
}
