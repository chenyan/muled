import {
  jupyterKernelSpecId,
  normalizeServerUrl,
} from '../main/services/ipynb/jupyterServerClient';

describe('jupyterServerClient helpers', () => {
  it('normalizes server URL without scheme', () => {
    expect(normalizeServerUrl('127.0.0.1:8888')).toBe('http://127.0.0.1:8888/');
    expect(normalizeServerUrl('http://127.0.0.1:8888/?token=abc')).toBe(
      'http://127.0.0.1:8888/?token=abc',
    );
  });

  it('extracts token from lab URL path and keeps origin + token', () => {
    expect(
      normalizeServerUrl('http://127.0.0.1:8888/lab?token=secret'),
    ).toBe('http://127.0.0.1:8888/?token=secret');
  });

  it('builds stable remote kernel spec ids from origin only', () => {
    const id = jupyterKernelSpecId('http://127.0.0.1:8888/?token=abc', {
      id: 'kernel-abc',
    });
    expect(id).toMatch(/^jupyter-server:[a-f0-9]{12}:kernel-abc$/);
    expect(id).toBe(
      jupyterKernelSpecId('http://127.0.0.1:8888/lab?token=other', {
        id: 'kernel-abc',
      }),
    );
  });
});

describe('listJupyterServerKernels', () => {
  const originalFetch = global.fetch;

  function jsonResponse(body: unknown, status = 200): Response {
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    } as Response;
  }

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('lists kernels from Jupyter Server API with token in URL', async () => {
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      expect(url).toContain('token=secret');
      if (url.includes('/api/kernels')) {
        return jsonResponse([
          { id: 'k1', name: 'python3' },
          { id: 'k2', name: 'ir' },
        ]);
      }
      if (url.endsWith('/api') || url.includes('/api?')) {
        return jsonResponse({ version: '2' });
      }
      return jsonResponse('not found', 404);
    }) as typeof fetch;

    const { listJupyterServerKernels } = await import(
      '../main/services/ipynb/jupyterServerClient'
    );
    const kernels = await listJupyterServerKernels({
      serverUrl: 'http://127.0.0.1:8888/?token=secret',
    });
    expect(kernels).toHaveLength(2);
    expect(kernels[0]?.id).toBe('k1');
  });

  it('throws when server is unreachable', async () => {
    global.fetch = jest.fn(async () => jsonResponse('', 403)) as typeof fetch;

    const { listJupyterServerKernels } = await import(
      '../main/services/ipynb/jupyterServerClient'
    );
    await expect(
      listJupyterServerKernels({
        serverUrl: 'http://127.0.0.1:8888/?token=secret',
      }),
    ).rejects.toThrow(/无法连接 Jupyter Server/);
  });
});
