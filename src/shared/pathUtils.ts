import fs from 'fs';
import os from 'os';
import path from 'path';

export function expandTilde(inputPath: string): string {
  if (inputPath.startsWith('~/')) {
    return path.join(os.homedir(), inputPath.slice(2));
  }
  if (inputPath === '~') {
    return os.homedir();
  }
  return inputPath;
}

/** 将绝对路径写回配置时尽量使用 ~ 简写 */
export function compressTilde(absolutePath: string): string {
  const homedir = os.homedir();
  if (absolutePath === homedir) {
    return '~';
  }
  const prefix = `${homedir}${path.sep}`;
  if (absolutePath.startsWith(prefix)) {
    return `~/${absolutePath.slice(prefix.length)}`;
  }
  return absolutePath;
}

export function getConfigDir(): string {
  return path.dirname(getConfigFilePath());
}

export function getConfigFilePath(): string {
  if (process.platform === 'win32') {
    return path.join(
      process.env.APPDATA ?? path.join(os.homedir(), 'AppData', 'Roaming'),
      'muled',
      'muled.yaml',
    );
  }
  return path.join(os.homedir(), '.config', 'muled', 'muled.yaml');
}

export function getRecentWorkspacesFilePath(): string {
  return path.join(getConfigDir(), 'recent-workspaces.json');
}

export function getWysiwygStyleDir(): string {
  return path.join(getConfigDir(), 'wysiwyg');
}

export function getTranslationHistoryFilePath(): string {
  return path.join(getConfigDir(), 'translation-history.md');
}

/** 可在 file IPC 中使用的配置目录内路径（含 ~ 简写） */
export function getTranslationHistoryConfigPath(): string {
  return compressTilde(getTranslationHistoryFilePath());
}

export type WysiwygTheme = 'light' | 'dark' | 'acme';

export function getWysiwygStylePath(theme: WysiwygTheme): string {
  return path.join(getWysiwygStyleDir(), `${theme}.css`);
}

export function resolvePath(inputPath: string, cwd?: string): string {
  const expanded = expandTilde(inputPath);
  if (path.isAbsolute(expanded)) {
    return path.normalize(expanded);
  }
  return path.normalize(path.resolve(cwd ?? process.cwd(), expanded));
}

/** 解析符号链接后的路径，便于比较 ~/obnotes 与 iCloud 真实路径 */
function normalizePathForComparison(input: string): string {
  try {
    if (typeof fs.realpathSync.native === 'function') {
      return fs.realpathSync.native(input);
    }
    return fs.realpathSync(input);
  } catch {
    return path.resolve(input);
  }
}

export function isPathInsideRoot(root: string, target: string): boolean {
  const normalizedRoot = normalizePathForComparison(root);
  const normalizedTarget = normalizePathForComparison(target);
  if (normalizedRoot === normalizedTarget) {
    return true;
  }
  const relative = path.relative(normalizedRoot, normalizedTarget);
  return (
    relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative)
  );
}

export function assertPathInsideRoot(root: string, target: string): string {
  const resolved = path.resolve(target);
  if (!isPathInsideRoot(root, resolved)) {
    throw new Error(`Path escapes workspace: ${target}`);
  }
  return resolved;
}

/** 将 rg/fd 等工具输出的路径转为相对 workspace 根的路径 */
export function toWorkspaceRelativePath(
  workspaceRoot: string,
  filePath: string,
): string | null {
  const absolute = path.isAbsolute(filePath)
    ? path.normalize(filePath)
    : path.resolve(path.resolve(workspaceRoot), filePath);
  if (!isPathInsideRoot(workspaceRoot, absolute)) {
    return null;
  }
  const rootReal = normalizePathForComparison(workspaceRoot);
  const absoluteReal = normalizePathForComparison(absolute);
  return path.relative(rootReal, absoluteReal).split(path.sep).join('/');
}

export function ensureParentDir(filePath: string): void {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}
