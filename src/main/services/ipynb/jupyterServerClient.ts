import { createHash } from 'crypto';

export interface JupyterServerConfig {
  serverUrl: string;
}

export interface JupyterKernelModel {
  id: string;
  name: string;
  last_activity?: string;
}

interface ParsedJupyterServerUrl {
  origin: string;
  token?: string;
}

function parseJupyterServerUrl(serverUrl: string): ParsedJupyterServerUrl {
  const trimmed = serverUrl.trim();
  if (!trimmed) {
    throw new Error('Jupyter Server URL 不能为空');
  }
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `http://${trimmed}`;
  const url = new URL(withScheme);
  const token = url.searchParams.get('token')?.trim() || undefined;
  return { origin: url.origin, token };
}

/** 规范化为 origin + ?token=…（token 从 URL 查询参数解析） */
export function normalizeServerUrl(serverUrl: string): string {
  const { origin, token } = parseJupyterServerUrl(serverUrl);
  const url = new URL(origin);
  if (token) {
    url.searchParams.set('token', token);
  }
  return url.toString();
}

function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 10_000,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...init, signal: controller.signal }).finally(() => {
    clearTimeout(timeout);
  });
}

function buildApiUrl(
  serverUrl: string,
  path: string,
  extraQuery?: Record<string, string>,
): string {
  const { origin, token } = parseJupyterServerUrl(serverUrl);
  const url = new URL(`${origin}${path.startsWith('/') ? path : `/${path}`}`);
  if (token) {
    url.searchParams.set('token', token);
  }
  if (extraQuery) {
    for (const [key, value] of Object.entries(extraQuery)) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

function toWebSocketUrl(httpUrl: string): string {
  const url = new URL(httpUrl);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.toString();
}

export function jupyterKernelSpecId(
  serverUrl: string,
  kernel: Pick<JupyterKernelModel, 'id'>,
): string {
  const { origin } = parseJupyterServerUrl(serverUrl);
  const serverHash = createHash('sha256')
    .update(origin)
    .digest('hex')
    .slice(0, 12);
  return `jupyter-server:${serverHash}:${kernel.id}`;
}

export async function verifyJupyterServer(
  config: JupyterServerConfig,
): Promise<void> {
  const response = await fetchWithTimeout(
    buildApiUrl(config.serverUrl, '/api'),
  );
  if (!response.ok) {
    throw new Error(`无法连接 Jupyter Server（HTTP ${response.status}）`);
  }
}

export async function listJupyterServerKernels(
  config: JupyterServerConfig,
): Promise<JupyterKernelModel[]> {
  const serverUrl = normalizeServerUrl(config.serverUrl);
  await verifyJupyterServer({ serverUrl });
  const response = await fetchWithTimeout(
    buildApiUrl(serverUrl, '/api/kernels'),
  );
  if (!response.ok) {
    throw new Error(`获取 Kernel 列表失败（HTTP ${response.status}）`);
  }
  const kernels = (await response.json()) as JupyterKernelModel[];
  return kernels.filter(
    (kernel) =>
      typeof kernel.id === 'string' &&
      kernel.id.length > 0 &&
      typeof kernel.name === 'string',
  );
}

export async function interruptJupyterKernel(
  config: JupyterServerConfig,
  kernelId: string,
): Promise<void> {
  const response = await fetchWithTimeout(
    buildApiUrl(
      config.serverUrl,
      `/api/kernels/${encodeURIComponent(kernelId)}/interrupt`,
    ),
    { method: 'POST' },
  );
  if (!response.ok && response.status !== 204) {
    throw new Error(`中断 Kernel 失败（HTTP ${response.status}）`);
  }
}

export async function restartJupyterKernel(
  config: JupyterServerConfig,
  kernelId: string,
): Promise<void> {
  const response = await fetchWithTimeout(
    buildApiUrl(
      config.serverUrl,
      `/api/kernels/${encodeURIComponent(kernelId)}/restart`,
    ),
    { method: 'POST' },
    30_000,
  );
  if (!response.ok && response.status !== 200 && response.status !== 204) {
    throw new Error(`重启 Kernel 失败（HTTP ${response.status}）`);
  }
}

export function buildJupyterKernelChannelsUrl(
  config: JupyterServerConfig,
  kernelId: string,
  sessionId: string,
): string {
  return buildApiUrl(
    config.serverUrl,
    `/api/kernels/${encodeURIComponent(kernelId)}/channels`,
    { session_id: sessionId },
  );
}

export function toJupyterWebSocketUrl(httpUrl: string): string {
  return toWebSocketUrl(httpUrl);
}
