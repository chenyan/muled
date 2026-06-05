import { resolvePath } from './pathUtils';

/** 比较两个工作区路径是否指向同一目录 */
export function isSameWorkspacePath(a: string, b: string): boolean {
  if (!a || !b) {
    return a === b;
  }
  return resolvePath(a) === resolvePath(b);
}

/** 设置表单中 workspace.path 是否被修改 */
export function didWorkspacePathChange(
  beforePath: string,
  afterPath: string,
): boolean {
  return !isSameWorkspacePath(beforePath, afterPath);
}
