/** 将工作区相对路径拼成绝对路径（renderer 侧，不依赖 Node path） */
export function workspaceAbsolutePath(
  workspaceRoot: string,
  relativePath: string,
): string {
  const root = workspaceRoot.replace(/[/\\]+$/, '');
  const rel = relativePath.replace(/^[/\\]+/, '');
  const sep = root.includes('\\') ? '\\' : '/';
  return `${root}${sep}${rel.split('/').join(sep)}`;
}
