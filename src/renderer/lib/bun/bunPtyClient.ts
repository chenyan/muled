import type { BunPtyCreateResponse } from '../../../shared/types/tools';
import { pushStatusToast } from '../statusToast';
import { estimateSchemeTerminalGridForPanel } from '../scheme/schemeTerminalSize';

export async function createBunPtySession(args: {
  path?: string;
  code?: string;
  language?: string;
  cols?: number;
  rows?: number;
}): Promise<string | null> {
  if (!window.muled?.bun?.pty?.create) {
    pushStatusToast('Bun 终端接口不可用', 'error');
    return null;
  }
  const estimated = estimateSchemeTerminalGridForPanel();
  const result: BunPtyCreateResponse = await window.muled.bun.pty.create({
    cols: args.cols ?? estimated.cols,
    rows: args.rows ?? estimated.rows,
    path: args.path,
    code: args.code,
    language: args.language,
  });
  if ('error' in result) {
    if (result.error === 'not_configured') {
      pushStatusToast(
        '未配置 Bun 可执行文件。请在设置 → 命令行工具中填写路径或点击「自动检测」。',
        'error',
      );
    } else {
      pushStatusToast(`无法启动 Bun 终端：${result.message}`, 'error');
    }
    return null;
  }
  return result.sessionId;
}

export async function killBunPtySession(sessionId: string): Promise<void> {
  if (!window.muled?.bun?.pty?.kill) return;
  await window.muled.bun.pty.kill(sessionId);
}
