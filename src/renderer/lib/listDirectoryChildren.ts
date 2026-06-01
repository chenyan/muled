import { isDirectoryPath } from './mime';

/** 列出目录的直接子项（文件或一级子目录），路径格式与工作区 paths 一致 */
export function listDirectoryChildren(
  allPaths: string[],
  directoryPath: string,
): string[] {
  const prefix =
    directoryPath === '' || directoryPath === '/'
      ? ''
      : isDirectoryPath(directoryPath)
        ? directoryPath
        : `${directoryPath}/`;
  const children = new Set<string>();

  for (const path of allPaths) {
    if (prefix && !path.startsWith(prefix)) continue;
    const rest = prefix ? path.slice(prefix.length) : path;
    if (!rest) continue;

    const slashIdx = rest.indexOf('/');
    if (slashIdx === -1) {
      children.add(prefix ? `${prefix}${rest}` : rest);
    } else {
      const child = rest.slice(0, slashIdx + 1);
      children.add(prefix ? `${prefix}${child}` : child);
    }
  }

  return [...children].sort((a, b) => {
    const nameA = a.replace(/\/$/, '').split('/').pop() ?? a;
    const nameB = b.replace(/\/$/, '').split('/').pop() ?? b;
    return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
  });
}
