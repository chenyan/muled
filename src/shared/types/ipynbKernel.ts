import type { IpynbKernelStatus, IpynbOutput } from './ipynb';

export interface LocalKernelSpec {
  kind: 'local';
  id: string;
  displayName: string;
  language: string;
  pythonPath: string;
  version?: string;
  hasIpython: boolean;
}

export interface JupyterServerKernelSpec {
  kind: 'jupyter-server';
  id: string;
  displayName: string;
  language: string;
  serverUrl: string;
  kernelId: string;
  kernelName: string;
}

export type KernelSpec = LocalKernelSpec | JupyterServerKernelSpec;

export function isLocalKernelSpec(spec: KernelSpec): spec is LocalKernelSpec {
  return spec.kind === 'local';
}

export function isJupyterServerKernelSpec(
  spec: KernelSpec,
): spec is JupyterServerKernelSpec {
  return spec.kind === 'jupyter-server';
}

export interface JupyterServerConnectionRequest {
  serverUrl: string;
}

export interface JupyterServerKernelInfo {
  id: string;
  name: string;
  displayName: string;
  specId: string;
}

export type IpynbKernelListResponse =
  | { ok: true; kernels: LocalKernelSpec[] }
  | { error: 'python_not_found'; message: string };

export type IpynbJupyterKernelListResponse =
  | { ok: true; kernels: JupyterServerKernelInfo[]; serverUrl: string }
  | { error: 'connection_failed'; message: string };

export type IpynbKernelStartResponse =
  | { ok: true; sessionId: string; status: IpynbKernelStatus }
  | { error: 'not_configured' }
  | { error: 'spawn_failed'; message: string }
  | { error: 'connection_failed'; message: string };

export type IpynbKernelSimpleResponse =
  | { ok: true; status?: IpynbKernelStatus }
  | { error: 'not_found' };

export interface IpynbKernelStatusPayload {
  sessionId: string;
  status: IpynbKernelStatus;
  error?: string;
}

export interface IpynbCellOutputPayload {
  sessionId: string;
  cellId: string;
  output: IpynbOutput;
}

export interface IpynbCellExecuteInputPayload {
  sessionId: string;
  cellId: string;
  executionCount: number;
}

export interface IpynbCellStatusPayload {
  sessionId: string;
  cellId: string;
  status: 'idle' | 'queued' | 'running' | 'success' | 'error';
  error?: string;
}

export interface IpynbCellExecuteReplyPayload {
  sessionId: string;
  cellId: string;
  executionCount: number;
  outputs: IpynbOutput[];
  status: 'ok' | 'error';
}

export interface IpynbKernelExecuteRequest {
  sessionId: string;
  cellId: string;
  source: string;
}

export interface IpynbKernelVariable {
  name: string;
  type: string;
  value: string;
}

export interface IpynbKernelInspectResult {
  memoryBytes: number | null;
  variables: IpynbKernelVariable[];
}

export type IpynbKernelInspectResponse =
  | { ok: true; result: IpynbKernelInspectResult }
  | {
      error: 'not_found' | 'not_ready' | 'busy' | 'timeout' | 'failed' | 'unsupported';
      message?: string;
    };
