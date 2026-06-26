import type { SchemeRunResponse } from '../../../shared/types/tools';
import { pushStatusToast } from '../statusToast';

export interface SchemeRunOutput {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export async function executeSchemeRun(args: {
  code?: string;
  path?: string;
}): Promise<SchemeRunOutput | null> {
  if (!window.muled?.scheme?.run) {
    pushStatusToast('Scheme 运行接口不可用', 'error');
    return null;
  }
  const result: SchemeRunResponse = await window.muled.scheme.run(args);
  if ('error' in result) {
    pushStatusToast(
      '未配置 Chez Scheme 可执行文件。请在设置 → 命令行工具中填写路径或点击「自动检测」。',
      'error',
    );
    return null;
  }
  if (result.exitCode !== 0) {
    pushStatusToast(`Scheme 脚本退出码 ${result.exitCode}`, 'error');
  }
  return {
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
  };
}

export function formatSchemeRunOutput(output: SchemeRunOutput): string {
  return [output.stdout, output.stderr].filter(Boolean).join('\n').trim();
}
