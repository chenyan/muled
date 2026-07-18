import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { randomUUID } from 'crypto';
import type { WebContents } from 'electron';
import type { IpynbKernelStatus, IpynbOutput } from '../../../shared/types/ipynb';
import type {
  IpynbCellExecuteReplyPayload,
  IpynbCellOutputPayload,
  IpynbCellStatusPayload,
  IpynbKernelInspectResult,
  IpynbKernelStatusPayload,
  IpynbKernelVariable,
  JupyterServerConnectionRequest,
  JupyterServerKernelInfo,
  JupyterServerKernelSpec,
  KernelSpec,
  LocalKernelSpec,
} from '../../../shared/types/ipynbKernel';
import { isJupyterServerKernelSpec } from '../../../shared/types/ipynbKernel';
import { getShellProcessEnv } from '../../shellPath';
import { JupyterKernelConnection } from './jupyterKernelConnection';
import {
  interruptJupyterKernel,
  jupyterKernelSpecId,
  listJupyterServerKernels,
  normalizeServerUrl,
  restartJupyterKernel,
  type JupyterServerConfig,
} from './jupyterServerClient';
import { PYTHON_KERNEL_BRIDGE_SOURCE } from './pythonKernelBridgeScript';

const EXECUTION_TIMEOUT_MS = 300_000;
const CONNECT_TIMEOUT_MS = 15_000;
const STDERR_BUFFER_MAX = 4096;
const INSPECT_TIMEOUT_MS = 5_000;

interface QueuedExecute {
  cellId: string;
  source: string;
  resolve: (reply: IpynbCellExecuteReplyPayload) => void;
  reject: (error: Error) => void;
}

interface PendingInspect {
  requestId: string;
  resolve: (result: IpynbKernelInspectResult) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

interface KernelSessionBase {
  sessionId: string;
  notebookKey: string;
  spec: KernelSpec;
  webContents: WebContents;
  status: IpynbKernelStatus;
  ready: boolean;
  queue: QueuedExecute[];
  running: QueuedExecute | null;
  executionTimeout: ReturnType<typeof setTimeout> | null;
  connectTimeout: ReturnType<typeof setTimeout> | null;
}

interface LocalKernelSession extends KernelSessionBase {
  transport: 'local';
  proc: ChildProcessWithoutNullStreams;
  bridgePath: string;
  lineBuffer: string;
  stderrBuffer: string;
  pendingInspect: PendingInspect | null;
}

interface JupyterHttpKernelSession extends KernelSessionBase {
  transport: 'jupyter-http';
  jupyterConn: JupyterKernelConnection | null;
  connectionError?: string;
}

type KernelSession = LocalKernelSession | JupyterHttpKernelSession;

const sessions = new Map<string, KernelSession>();
const notebookSession = new Map<string, string>();
const webContentsSessions = new Map<number, Set<string>>();

function isLocalSession(
  session: KernelSession,
): session is LocalKernelSession {
  return session.transport === 'local';
}

function isJupyterSession(
  session: KernelSession,
): session is JupyterHttpKernelSession {
  return session.transport === 'jupyter-http';
}

function ensureBridgeScriptPath(): string {
  const target = path.join(
    os.tmpdir(),
    `muled-python-kernel-bridge-${process.pid}.py`,
  );
  fs.writeFileSync(target, PYTHON_KERNEL_BRIDGE_SOURCE, { mode: 0o755 });
  return target;
}

function sendStatus(session: KernelSession, error?: string): void {
  if (session.webContents.isDestroyed()) return;
  const payload: IpynbKernelStatusPayload = {
    sessionId: session.sessionId,
    status: session.status,
    error,
  };
  session.webContents.send('ipynb:kernel:status', payload);
}

function sendCellStatus(
  session: KernelSession,
  cellId: string,
  status: IpynbCellStatusPayload['status'],
  error?: string,
): void {
  if (session.webContents.isDestroyed()) return;
  const payload: IpynbCellStatusPayload = {
    sessionId: session.sessionId,
    cellId,
    status,
    error,
  };
  session.webContents.send('ipynb:cell:status', payload);
}

function trackWebContents(sessionId: string, webContents: WebContents): void {
  const wcId = webContents.id;
  let ids = webContentsSessions.get(wcId);
  if (!ids) {
    ids = new Set();
    webContentsSessions.set(wcId, ids);
    webContents.once('destroyed', () => {
      const sessionIds = [...ids!];
      webContentsSessions.delete(wcId);
      for (const id of sessionIds) {
        disposeKernelSession(id);
      }
    });
  }
  ids.add(sessionId);
}

function untrackWebContents(sessionId: string, webContents: WebContents): void {
  const ids = webContentsSessions.get(webContents.id);
  if (!ids) return;
  ids.delete(sessionId);
  if (ids.size === 0) {
    webContentsSessions.delete(webContents.id);
  }
}

function clearExecutionTimeout(session: KernelSession): void {
  if (session.executionTimeout) {
    clearTimeout(session.executionTimeout);
    session.executionTimeout = null;
  }
}

function clearConnectTimeout(session: KernelSession): void {
  if (session.connectTimeout) {
    clearTimeout(session.connectTimeout);
    session.connectTimeout = null;
  }
}

function appendStderr(session: LocalKernelSession, chunk: string): void {
  session.stderrBuffer = (session.stderrBuffer + chunk).slice(-STDERR_BUFFER_MAX);
}

function formatKernelFailureMessage(
  session: KernelSession,
  base: string,
): string {
  if (isJupyterSession(session) && session.connectionError) {
    return `${base}: ${session.connectionError}`;
  }
  if (isLocalSession(session)) {
    const detail = session.stderrBuffer.trim();
    if (detail) {
      const tail = detail.length > 500 ? detail.slice(-500) : detail;
      return `${base}: ${tail}`;
    }
  }
  return base;
}

function finishRunning(
  session: KernelSession,
  reply: IpynbCellExecuteReplyPayload,
): void {
  clearExecutionTimeout(session);
  const current = session.running;
  session.running = null;
  session.status = 'idle';
  sendStatus(session);
  if (current) {
    sendCellStatus(
      session,
      current.cellId,
      reply.status === 'ok' ? 'success' : 'error',
    );
    if (!session.webContents.isDestroyed()) {
      session.webContents.send('ipynb:cell:executeReply', reply);
    }
    current.resolve(reply);
  }
  drainQueue(session);
}

function failRunning(session: KernelSession, message: string): void {
  clearExecutionTimeout(session);
  const current = session.running;
  session.running = null;
  session.status = 'error';
  sendStatus(session, message);
  if (current) {
    sendCellStatus(session, current.cellId, 'error', message);
    current.reject(new Error(message));
  }
  drainQueue(session);
}

function drainQueue(session: KernelSession): void {
  if (session.running || session.queue.length === 0 || !session.ready) return;
  const next = session.queue.shift()!;
  runExecute(session, next);
}

function sendCellOutput(
  session: KernelSession,
  cellId: string,
  output: IpynbOutput,
): void {
  if (session.webContents.isDestroyed()) return;
  const payload: IpynbCellOutputPayload = {
    sessionId: session.sessionId,
    cellId,
    output,
  };
  session.webContents.send('ipynb:cell:output', payload);
}

function clearPendingInspect(session: LocalKernelSession): void {
  if (!session.pendingInspect) return;
  clearTimeout(session.pendingInspect.timeout);
  session.pendingInspect = null;
}

function parseInspectVariables(raw: unknown): IpynbKernelVariable[] {
  if (!Array.isArray(raw)) return [];
  const variables: IpynbKernelVariable[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    const name = typeof record.name === 'string' ? record.name : '';
    if (!name) continue;
    variables.push({
      name,
      type: typeof record.type === 'string' ? record.type : 'unknown',
      value: typeof record.value === 'string' ? record.value : '',
    });
  }
  return variables;
}

function handleBridgeLine(session: LocalKernelSession, line: string): void {
  let msg: Record<string, unknown>;
  try {
    msg = JSON.parse(line) as Record<string, unknown>;
  } catch {
    return;
  }

  if (msg.type === 'ready') {
    session.ready = true;
    clearConnectTimeout(session);
    session.status = 'idle';
    sendStatus(session);
    drainQueue(session);
    return;
  }

  if (msg.type === 'inspect_reply') {
    const pending = session.pendingInspect;
    if (!pending) return;
    if (msg.request_id !== pending.requestId) return;
    clearPendingInspect(session);
    pending.resolve({
      memoryBytes:
        typeof msg.memory_bytes === 'number' ? msg.memory_bytes : null,
      variables: parseInspectVariables(msg.variables),
    });
    return;
  }

  if (!session.running) {
    return;
  }

  const cellId = session.running.cellId;

  if (msg.type === 'stream') {
    const name = msg.name === 'stderr' ? 'stderr' : 'stdout';
    const text = typeof msg.text === 'string' ? msg.text : '';
    if (!text) return;
    sendCellOutput(session, cellId, {
      output_type: 'stream',
      name,
      text,
    });
    return;
  }

  if (msg.type === 'display') {
    const output = msg.output;
    if (!output || typeof output !== 'object') return;
    sendCellOutput(session, cellId, output as IpynbOutput);
    return;
  }

  if (msg.type !== 'execute_reply') {
    return;
  }

  const outputs = Array.isArray(msg.outputs)
    ? (msg.outputs as IpynbOutput[])
    : [];
  const executionCount =
    typeof msg.execution_count === 'number' ? msg.execution_count : 0;
  const status = msg.status === 'error' ? 'error' : 'ok';
  const reply: IpynbCellExecuteReplyPayload = {
    sessionId: session.sessionId,
    cellId,
    executionCount,
    outputs,
    status,
  };
  finishRunning(session, reply);
}

function attachStdout(session: LocalKernelSession): void {
  session.proc.stdout.setEncoding('utf8');
  session.proc.stdout.on('data', (chunk: string) => {
    session.lineBuffer += chunk;
    let index = session.lineBuffer.indexOf('\n');
    while (index >= 0) {
      const line = session.lineBuffer.slice(0, index).trim();
      session.lineBuffer = session.lineBuffer.slice(index + 1);
      if (line) {
        handleBridgeLine(session, line);
      }
      index = session.lineBuffer.indexOf('\n');
    }
  });
}

function spawnKernelProcess(
  spec: LocalKernelSpec,
  cwd: string,
): ChildProcessWithoutNullStreams {
  const bridgePath = ensureBridgeScriptPath();
  return spawn(spec.pythonPath, ['-u', bridgePath], {
    cwd,
    env: {
      ...getShellProcessEnv(),
      PYTHONUNBUFFERED: '1',
      PYTHONIOENCODING: 'utf-8',
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

function jupyterConfigFromSpec(
  spec: JupyterServerKernelSpec,
): JupyterServerConfig {
  return { serverUrl: spec.serverUrl };
}

function markJupyterConnectionFailed(
  session: JupyterHttpKernelSession,
  message: string,
): void {
  clearConnectTimeout(session);
  session.connectionError = message;
  session.status = 'error';
  session.ready = false;
  sendStatus(session, message);
  sessions.delete(session.sessionId);
  if (notebookSession.get(session.notebookKey) === session.sessionId) {
    notebookSession.delete(session.notebookKey);
  }
  untrackWebContents(session.sessionId, session.webContents);
}

async function connectJupyterSession(
  session: JupyterHttpKernelSession,
  spec: JupyterServerKernelSpec,
): Promise<void> {
  const conn = new JupyterKernelConnection(
    jupyterConfigFromSpec(spec),
    spec.kernelId,
  );
  session.jupyterConn = conn;
  try {
    await conn.connect();
    clearConnectTimeout(session);
    session.ready = true;
    session.status = 'idle';
    sendStatus(session);
    drainQueue(session);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    conn.close();
    session.jupyterConn = null;
    markJupyterConnectionFailed(session, message);
  }
}

function runLocalExecute(session: LocalKernelSession, item: QueuedExecute): void {
  session.running = item;
  session.status = 'busy';
  sendStatus(session);
  sendCellStatus(session, item.cellId, 'running');

  const request = JSON.stringify({
    type: 'execute',
    cell_id: item.cellId,
    code: item.source,
  });
  session.proc.stdin.write(`${request}\n`);

  session.executionTimeout = setTimeout(() => {
    failRunning(session, 'Cell 执行超时');
    session.proc.kill('SIGTERM');
  }, EXECUTION_TIMEOUT_MS);
}

function runJupyterExecute(
  session: JupyterHttpKernelSession,
  item: QueuedExecute,
): void {
  const conn = session.jupyterConn;
  if (!conn) {
    failRunning(session, 'Jupyter Kernel 未连接');
    return;
  }

  session.running = item;
  session.status = 'busy';
  sendStatus(session);
  sendCellStatus(session, item.cellId, 'running');

  session.executionTimeout = setTimeout(() => {
    void interruptJupyterKernel(
      jupyterConfigFromSpec(session.spec as JupyterServerKernelSpec),
      (session.spec as JupyterServerKernelSpec).kernelId,
    ).catch(() => undefined);
    conn.interrupt();
    failRunning(session, 'Cell 执行超时');
  }, EXECUTION_TIMEOUT_MS);

  void conn
    .execute(item.source, item.cellId, {
      onStream: (name, text) => {
        sendCellOutput(session, item.cellId, {
          output_type: 'stream',
          name,
          text,
        });
      },
      onDisplay: (output) => {
        sendCellOutput(session, item.cellId, output);
      },
    })
    .then((result) => {
      if (session.running?.cellId !== item.cellId) {
        return;
      }
      const reply: IpynbCellExecuteReplyPayload = {
        sessionId: session.sessionId,
        cellId: item.cellId,
        executionCount: result.executionCount,
        outputs: result.outputs,
        status: result.status,
      };
      finishRunning(session, reply);
    })
    .catch((error) => {
      if (session.running?.cellId !== item.cellId) {
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      failRunning(session, message);
    });
}

function runExecute(session: KernelSession, item: QueuedExecute): void {
  if (isLocalSession(session)) {
    runLocalExecute(session, item);
    return;
  }
  runJupyterExecute(session, item);
}

export function buildJupyterServerKernelSpec(
  config: JupyterServerConfig,
  kernel: { id: string; name: string },
): JupyterServerKernelSpec {
  const serverUrl = normalizeServerUrl(config.serverUrl);
  return {
    kind: 'jupyter-server',
    id: jupyterKernelSpecId(serverUrl, kernel),
    displayName: `Jupyter · ${kernel.name} (${kernel.id.slice(0, 8)})`,
    language: 'python',
    serverUrl,
    kernelId: kernel.id,
    kernelName: kernel.name,
  };
}

export async function listRemoteJupyterKernels(
  request: JupyterServerConnectionRequest,
): Promise<JupyterServerKernelInfo[]> {
  const config: JupyterServerConfig = {
    serverUrl: request.serverUrl,
  };
  const serverUrl = normalizeServerUrl(config.serverUrl);
  const kernels = await listJupyterServerKernels(config);
  return kernels.map((kernel) => ({
    id: kernel.id,
    name: kernel.name,
    displayName: `Jupyter · ${kernel.name} (${kernel.id.slice(0, 8)})`,
    specId: jupyterKernelSpecId(serverUrl, kernel),
  }));
}

export function startKernelSession(args: {
  notebookKey: string;
  spec: KernelSpec;
  cwd: string;
  webContents: WebContents;
}):
  | { sessionId: string }
  | { error: 'spawn_failed'; message: string }
  | { error: 'connection_failed'; message: string } {
  const existingId = notebookSession.get(args.notebookKey);
  if (existingId) {
    disposeKernelSession(existingId);
  }

  const sessionId = randomUUID();

  if (isJupyterServerKernelSpec(args.spec)) {
    const session: JupyterHttpKernelSession = {
      sessionId,
      notebookKey: args.notebookKey,
      spec: args.spec,
      webContents: args.webContents,
      transport: 'jupyter-http',
      jupyterConn: null,
      status: 'connecting',
      ready: false,
      queue: [],
      running: null,
      executionTimeout: null,
      connectTimeout: null,
    };

    sessions.set(sessionId, session);
    notebookSession.set(args.notebookKey, sessionId);
    trackWebContents(sessionId, args.webContents);
    sendStatus(session);

    session.connectTimeout = setTimeout(() => {
      if (session.status !== 'connecting') return;
      markJupyterConnectionFailed(session, 'Kernel 连接超时');
      session.jupyterConn?.close();
      session.jupyterConn = null;
    }, CONNECT_TIMEOUT_MS);

    void connectJupyterSession(session, args.spec);
    return { sessionId };
  }

  let proc: ChildProcessWithoutNullStreams;
  try {
    proc = spawnKernelProcess(args.spec, args.cwd);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { error: 'spawn_failed', message };
  }

  const session: LocalKernelSession = {
    sessionId,
    notebookKey: args.notebookKey,
    spec: args.spec,
    webContents: args.webContents,
    transport: 'local',
    proc,
    bridgePath: ensureBridgeScriptPath(),
    status: 'connecting',
    lineBuffer: '',
    stderrBuffer: '',
    ready: false,
    queue: [],
    running: null,
    executionTimeout: null,
    connectTimeout: null,
    pendingInspect: null,
  };

  sessions.set(sessionId, session);
  notebookSession.set(args.notebookKey, sessionId);
  trackWebContents(sessionId, args.webContents);
  sendStatus(session);

  attachStdout(session);

  session.connectTimeout = setTimeout(() => {
    if (session.status !== 'connecting') return;
    session.status = 'error';
    sendStatus(
      session,
      formatKernelFailureMessage(session, 'Kernel 连接超时'),
    );
    try {
      session.proc.kill('SIGTERM');
    } catch {
      // ignore
    }
  }, CONNECT_TIMEOUT_MS);

  proc.stderr.setEncoding('utf8');
  proc.stderr.on('data', (chunk: string) => {
    appendStderr(session, chunk);
  });

  proc.on('error', (error) => {
    clearConnectTimeout(session);
    session.status = 'error';
    appendStderr(session, error.message);
    sendStatus(
      session,
      formatKernelFailureMessage(session, error.message),
    );
    failRunning(session, error.message);
  });

  proc.on('close', () => {
    clearConnectTimeout(session);
    const message = session.ready
      ? formatKernelFailureMessage(session, 'Kernel 已退出')
      : formatKernelFailureMessage(session, 'Kernel 启动失败');
    session.status = session.ready ? 'disconnected' : 'error';
    sendStatus(session, message);
    if (session.running) {
      failRunning(session, message);
    }
    sessions.delete(sessionId);
    if (notebookSession.get(args.notebookKey) === sessionId) {
      notebookSession.delete(args.notebookKey);
    }
    untrackWebContents(sessionId, args.webContents);
  });

  return { sessionId };
}

export function executeCell(args: {
  sessionId: string;
  cellId: string;
  source: string;
}): Promise<IpynbCellExecuteReplyPayload> {
  const session = sessions.get(args.sessionId);
  if (!session) {
    return Promise.reject(new Error('Kernel session not found'));
  }

  return new Promise((resolve, reject) => {
    session.queue.push({
      cellId: args.cellId,
      source: args.source,
      resolve,
      reject,
    });
    sendCellStatus(session, args.cellId, 'queued');
    drainQueue(session);
  });
}

export function interruptKernel(sessionId: string): boolean {
  const session = sessions.get(sessionId);
  if (!session) return false;

  if (isJupyterSession(session)) {
    const spec = session.spec;
    if (!isJupyterServerKernelSpec(spec)) return false;
    void interruptJupyterKernel(jupyterConfigFromSpec(spec), spec.kernelId).catch(
      () => undefined,
    );
    session.jupyterConn?.interrupt();
    return true;
  }

  session.proc.kill('SIGINT');
  return true;
}

export function restartKernelSession(sessionId: string, cwd: string): string | null {
  const session = sessions.get(sessionId);
  if (!session) return null;
  const { notebookKey, spec, webContents } = session;

  if (isJupyterSession(session) && isJupyterServerKernelSpec(spec)) {
    const config = jupyterConfigFromSpec(spec);
    void restartJupyterKernel(config, spec.kernelId)
      .then(() => {
        session.jupyterConn?.close();
        session.jupyterConn = null;
        session.ready = false;
        session.status = 'connecting';
        sendStatus(session);
        void connectJupyterSession(session, spec);
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        session.status = 'error';
        sendStatus(session, message);
      });
    return sessionId;
  }

  disposeKernelSession(sessionId);
  const started = startKernelSession({ notebookKey, spec, cwd, webContents });
  if ('error' in started) return null;
  return started.sessionId;
}

export function disposeKernelSession(sessionId: string): boolean {
  const session = sessions.get(sessionId);
  if (!session) return false;

  clearExecutionTimeout(session);
  clearConnectTimeout(session);

  if (isLocalSession(session)) {
    clearPendingInspect(session);
    try {
      session.proc.stdin.write(`${JSON.stringify({ type: 'shutdown' })}\n`);
    } catch {
      // ignore
    }
    session.proc.kill('SIGTERM');
    setTimeout(() => {
      if (!session.proc.killed) {
        session.proc.kill('SIGKILL');
      }
    }, 500);
  } else {
    session.jupyterConn?.close();
    session.jupyterConn = null;
  }

  sessions.delete(sessionId);
  if (notebookSession.get(session.notebookKey) === sessionId) {
    notebookSession.delete(session.notebookKey);
  }
  untrackWebContents(sessionId, session.webContents);
  return true;
}

export function killAllIpynbKernelSessions(): void {
  for (const sessionId of [...sessions.keys()]) {
    disposeKernelSession(sessionId);
  }
}

export function getKernelSessionStatus(
  sessionId: string,
): IpynbKernelStatus | null {
  return sessions.get(sessionId)?.status ?? null;
}

export function inspectKernelSession(
  sessionId: string,
): Promise<IpynbKernelInspectResult> {
  const session = sessions.get(sessionId);
  if (!session) {
    return Promise.reject(new Error('Kernel session not found'));
  }
  if (!session.ready) {
    return Promise.reject(new Error('Kernel not ready'));
  }
  if (isJupyterSession(session)) {
    return Promise.reject(new Error('Inspect not supported for remote kernel'));
  }
  if (session.pendingInspect) {
    return Promise.reject(new Error('Inspect already in progress'));
  }

  const requestId = randomUUID();
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (session.pendingInspect?.requestId !== requestId) return;
      clearPendingInspect(session);
      reject(new Error('Inspect timeout'));
    }, INSPECT_TIMEOUT_MS);

    session.pendingInspect = {
      requestId,
      resolve,
      reject,
      timeout,
    };

    try {
      session.proc.stdin.write(
        `${JSON.stringify({ type: 'inspect', request_id: requestId })}\n`,
      );
    } catch (error) {
      clearPendingInspect(session);
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}
