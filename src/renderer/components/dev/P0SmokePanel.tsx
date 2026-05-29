import { useEffect, useState } from 'react';

type SmokeState =
  | { status: 'loading' }
  | { status: 'ok'; root: string; pathCount: number; sampleFile?: string }
  | { status: 'error'; message: string };

/** P0 验证面板：确认 preload IPC 可用 */
export default function P0SmokePanel() {
  const [state, setState] = useState<SmokeState>({ status: 'loading' });

  useEffect(() => {
    async function run() {
      try {
        if (!window.muled) {
          setState({ status: 'error', message: 'window.muled not exposed' });
          return;
        }
        const config = await window.muled.config.get();
        const { root } = await window.muled.workspace.get();
        const { paths } = await window.muled.workspace.list();
        let sampleFile: string | undefined;
        const md = paths.find(
          (p) => !p.endsWith('/') && p.toLowerCase().endsWith('.md'),
        );
        if (md) {
          const file = await window.muled.file.read(md);
          sampleFile = `${md} (${file.content.length} chars, truncated=${file.truncated})`;
        }
        setState({
          status: 'ok',
          root,
          pathCount: paths.length,
          sampleFile: sampleFile ?? `mode=${config.editor.mode}`,
        });
      } catch (e) {
        setState({
          status: 'error',
          message: e instanceof Error ? e.message : String(e),
        });
      }
    }
    run().catch(() => {
      /* handled in run */
    });
  }, []);

  if (state.status === 'loading') {
    return <div className="P0Smoke">P0 IPC 检查中…</div>;
  }
  if (state.status === 'error') {
    return (
      <div className="P0Smoke P0Smoke--error">P0 失败: {state.message}</div>
    );
  }
  return (
    <div className="P0Smoke P0Smoke--ok">
      <div>P0 IPC OK</div>
      <div>workspace: {state.root}</div>
      <div>paths: {state.pathCount}</div>
      {state.sampleFile && <div>{state.sampleFile}</div>}
    </div>
  );
}
