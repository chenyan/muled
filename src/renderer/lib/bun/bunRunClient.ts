import type { BunRunResponse } from '../../../shared/types/tools';
import { pushStatusToast } from '../statusToast';

export interface BunRunOutput {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export async function executeBunRun(args: {
  code?: string;
  path?: string;
  language?: string;
}): Promise<BunRunOutput | null> {
  if (!window.muled?.bun?.run) {
    pushStatusToast('Bun 运行接口不可用', 'error');
    return null;
  }
  const result: BunRunResponse = await window.muled.bun.run(args);
  if ('error' in result) {
    pushStatusToast(
      '未配置 Bun 可执行文件。请在设置 → 命令行工具中填写路径或点击「自动检测」。',
      'error',
    );
    return null;
  }
  if (result.exitCode !== 0 && result.exitCode !== 124 && result.exitCode !== 130) {
    pushStatusToast(`脚本退出码 ${result.exitCode}`, 'error');
  }
  return {
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
  };
}

export async function abortBunRun(): Promise<void> {
  if (!window.muled?.bun?.abort) return;
  await window.muled.bun.abort();
}

export function formatBunRunOutput(output: BunRunOutput): string {
  return [output.stdout, output.stderr].filter(Boolean).join('\n').trim();
}
