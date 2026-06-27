import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export function sanitizeSpawnEnv(
  env: NodeJS.ProcessEnv,
): Record<string, string> {
  const sanitized: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (typeof value === 'string') {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function normalizeCpuArch(arch: string): string {
  if (arch === 'x64' || arch === 'x86_64') return 'x64';
  if (arch === 'arm64' || arch === 'aarch64') return 'arm64';
  return arch;
}

function readMachOArch(filePath: string): string | null {
  if (process.platform !== 'darwin') {
    return null;
  }
  try {
    const output = execFileSync('/usr/bin/file', ['-b', filePath], {
      encoding: 'utf8',
      timeout: 3000,
    });
    if (output.includes('arm64')) return 'arm64';
    if (output.includes('x86_64')) return 'x64';
  } catch {
    // ignore file inspection failures
  }
  return null;
}

export function describePtySpawnFailure(message: string): string {
  if (!message.includes('posix_spawnp')) {
    return message;
  }

  try {
    const ptyRoot = path.dirname(require.resolve('node-pty'));
    const helperPath = path.join(ptyRoot, 'build', 'Release', 'spawn-helper');
    if (!fs.existsSync(helperPath)) {
      return `${message}（node-pty 未正确编译，请在项目根目录运行 npm run rebuild）`;
    }

    const helperArch = readMachOArch(helperPath);
    const runtimeArch = normalizeCpuArch(process.arch);
    if (helperArch && helperArch !== runtimeArch) {
      return `${message}（node-pty 为 ${helperArch} 编译，当前 Electron 为 ${runtimeArch}，请运行 npm run rebuild 后重启）`;
    }
  } catch {
    // ignore resolution failures
  }

  return `${message}（node-pty 启动失败，可尝试 npm run rebuild 后重启应用）`;
}
