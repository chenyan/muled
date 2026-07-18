import type {
  IpynbCellExecuteReplyPayload,
  IpynbCellOutputPayload,
  IpynbCellStatusPayload,
  IpynbKernelInspectResult,
  IpynbKernelStatusPayload,
  JupyterServerKernelInfo,
  LocalKernelSpec,
} from '../../../shared/types/ipynbKernel';

export async function listIpynbKernels(): Promise<LocalKernelSpec[]> {
  const result = await window.muled.ipynb.listKernels();
  if ('error' in result) {
    return [];
  }
  return result.kernels;
}

export type ListJupyterServerKernelsResult =
  | { ok: true; kernels: JupyterServerKernelInfo[]; serverUrl: string }
  | { error: string };

export async function listJupyterServerKernels(args: {
  serverUrl: string;
}): Promise<ListJupyterServerKernelsResult> {
  const result = await window.muled.ipynb.listJupyterKernels(args);
  if ('error' in result) {
    return { error: result.message ?? '连接 Jupyter Server 失败' };
  }
  return {
    ok: true,
    kernels: result.kernels,
    serverUrl: result.serverUrl,
  };
}

export type StartIpynbKernelResult =
  | { ok: true; sessionId: string }
  | { error: string };

export async function startIpynbKernel(
  args:
    | {
        notebookKey: string;
        specId: string;
        cwd?: string;
      }
    | {
        notebookKey: string;
        cwd?: string;
        jupyterServer: {
          serverUrl: string;
          kernelId: string;
          kernelName: string;
        };
      },
): Promise<StartIpynbKernelResult> {
  const result = await window.muled.ipynb.startKernel(args);
  if ('error' in result) {
    if (result.error === 'spawn_failed' || result.error === 'connection_failed') {
      return { error: result.message };
    }
    if (result.error === 'not_configured') {
      return { error: '未找到所选 Kernel' };
    }
    return { error: '启动 Kernel 失败' };
  }
  return { ok: true, sessionId: result.sessionId };
}

export function disposeIpynbKernel(sessionId: string): void {
  void window.muled.ipynb.disposeKernel(sessionId);
}

export async function restartIpynbKernel(
  sessionId: string,
  cwd?: string,
): Promise<string | null> {
  const result = await window.muled.ipynb.restartKernel({ sessionId, cwd });
  if ('error' in result) {
    return null;
  }
  return result.sessionId ?? sessionId;
}

export function interruptIpynbKernel(sessionId: string): void {
  void window.muled.ipynb.interruptKernel(sessionId);
}

export function executeIpynbCell(args: {
  sessionId: string;
  cellId: string;
  source: string;
}): void {
  void window.muled.ipynb.executeCell(args);
}

export async function inspectIpynbKernel(
  sessionId: string,
): Promise<IpynbKernelInspectResult | null> {
  const result = await window.muled.ipynb.inspectKernel(sessionId);
  if ('error' in result) {
    return null;
  }
  return result.result;
}

export function subscribeIpynbKernelEvents(handlers: {
  onKernelStatus?: (payload: IpynbKernelStatusPayload) => void;
  onCellStatus?: (payload: IpynbCellStatusPayload) => void;
  onCellOutput?: (payload: IpynbCellOutputPayload) => void;
  onCellExecuteReply?: (payload: IpynbCellExecuteReplyPayload) => void;
}): () => void {
  const unsubs: Array<() => void> = [];
  if (handlers.onKernelStatus) {
    unsubs.push(window.muled.ipynb.onKernelStatus(handlers.onKernelStatus));
  }
  if (handlers.onCellStatus) {
    unsubs.push(window.muled.ipynb.onCellStatus(handlers.onCellStatus));
  }
  if (handlers.onCellOutput) {
    unsubs.push(window.muled.ipynb.onCellOutput(handlers.onCellOutput));
  }
  if (handlers.onCellExecuteReply) {
    unsubs.push(
      window.muled.ipynb.onCellExecuteReply(handlers.onCellExecuteReply),
    );
  }
  return () => {
    for (const unsub of unsubs) {
      unsub();
    }
  };
}
