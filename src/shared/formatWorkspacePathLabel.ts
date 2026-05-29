/** 将绝对路径格式化为 UI 标签（~ 表示用户主目录），无 Node 内置模块依赖 */
export function formatWorkspacePathLabel(
  absolutePath: string,
  homeDir: string,
): string {
  const normalized = absolutePath.replace(/\\/g, '/');
  const home = homeDir.replace(/\\/g, '/').replace(/\/$/, '');
  if (!home) {
    return normalized;
  }
  if (normalized === home) {
    return '~';
  }
  const prefix = `${home}/`;
  if (normalized.startsWith(prefix)) {
    return `~${normalized.slice(home.length)}`;
  }
  return normalized;
}
