import type {
  PythonPtyCreateResponse,
  PythonPtyMode,
} from '../../../shared/types/tools';
import { pushStatusToast } from '../statusToast';
import { estimateSchemeTerminalGridForPanel } from '../scheme/schemeTerminalSize';

export async function createPythonPtySession(args: {
  mode: PythonPtyMode;
  path?: string;
  code?: string;
  cols?: number;
  rows?: number;
}): Promise<string | null> {
  if (!window.muled?.python?.pty?.create) {
    pushStatusToast('Python 终端接口不可用', 'error');
    return null;
  }
  const estimated = estimateSchemeTerminalGridForPanel();
  const result: PythonPtyCreateResponse = await window.muled.python.pty.create({
    mode: args.mode,
    cols: args.cols ?? estimated.cols,
    rows: args.rows ?? estimated.rows,
    path: args.path,
    code: args.code,
  });
  if ('error' in result) {
    if (result.error === 'not_configured') {
      pushStatusToast(
        '未配置 Python 可执行文件。请在设置 → 命令行工具中填写路径或点击「自动检测」。',
        'error',
      );
    } else if (result.error === 'ipython_not_available') {
      pushStatusToast(result.message, 'error');
    } else {
      pushStatusToast(`无法启动 Python 终端：${result.message}`, 'error');
    }
    return null;
  }
  return result.sessionId;
}

export async function killPythonPtySession(sessionId: string): Promise<void> {
  if (!window.muled?.python?.pty?.kill) return;
  await window.muled.python.pty.kill(sessionId);
}
