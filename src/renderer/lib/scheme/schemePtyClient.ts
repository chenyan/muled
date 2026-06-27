import type { SchemePtyCreateResponse } from '../../../shared/types/tools';
import { pushStatusToast } from '../statusToast';
import { estimateSchemeTerminalGridForPanel } from './schemeTerminalSize';

export async function createSchemePtySession(args: {
  path?: string;
  code?: string;
  cols?: number;
  rows?: number;
}): Promise<string | null> {
  if (!window.muled?.scheme?.pty?.create) {
    pushStatusToast('Scheme 终端接口不可用', 'error');
    return null;
  }
  const estimated = estimateSchemeTerminalGridForPanel();
  const result: SchemePtyCreateResponse = await window.muled.scheme.pty.create({
    cols: args.cols ?? estimated.cols,
    rows: args.rows ?? estimated.rows,
    path: args.path,
    code: args.code,
  });
  if ('error' in result) {
    if (result.error === 'not_configured') {
      pushStatusToast(
        '未配置 Chez Scheme 可执行文件。请在设置 → 命令行工具中填写路径或点击「自动检测」。',
        'error',
      );
    } else {
      pushStatusToast(`无法启动 Scheme 终端：${result.message}`, 'error');
    }
    return null;
  }
  return result.sessionId;
}

export async function killSchemePtySession(sessionId: string): Promise<void> {
  if (!window.muled?.scheme?.pty?.kill) return;
  await window.muled.scheme.pty.kill(sessionId);
}
