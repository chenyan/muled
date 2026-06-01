import { useCallback, useEffect, useState } from 'react';

export interface WorkspaceState {
  root: string;
  paths: string[];
  recent: string[];
  loading: boolean;
  error: string | null;
}

export function useWorkspace() {
  const [state, setState] = useState<WorkspaceState>({
    root: '',
    paths: [],
    recent: [],
    loading: false,
    error: null,
  });

  const refresh = useCallback(async () => {
    if (!window.muled?.workspace) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: '应用 API 未就绪（请在 Electron 中运行）',
      }));
      return;
    }
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { root, recent } = await window.muled.workspace.get();
      const { paths } = await window.muled.workspace.listChildren('');
      setState({ root, paths, recent, loading: false, error: null });
    } catch (e) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: e instanceof Error ? e.message : String(e),
      }));
    }
  }, []);

  const cd = useCallback(async (targetPath: string) => {
    if (!window.muled?.workspace) {
      throw new Error('应用 API 未就绪（请在 Electron 中运行）');
    }
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { root, paths, recent } = await window.muled.workspace.cd(targetPath);
      setState({ root, paths, recent, loading: false, error: null });
    } catch (e) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: e instanceof Error ? e.message : String(e),
      }));
      throw e;
    }
  }, []);

  useEffect(() => {
    refresh().catch(() => {
      /* setState in refresh */
    });
  }, [refresh]);

  return { ...state, refresh, cd };
}
