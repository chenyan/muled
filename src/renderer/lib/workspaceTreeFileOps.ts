import { directoryPath } from './workspaceTreeReveal';

export function normalizeDirectoryPath(relativeDir: string): string {
  if (relativeDir === '') return '';
  return relativeDir.endsWith('/') ? relativeDir : `${relativeDir}/`;
}

export function leafName(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, '/').replace(/\/$/, '');
  const separatorIndex = normalized.lastIndexOf('/');
  return separatorIndex < 0
    ? normalized
    : normalized.slice(separatorIndex + 1);
}

export function joinRelativePath(
  parentDir: string,
  name: string,
  isDirectory: boolean,
): string {
  const parent = normalizeDirectoryPath(parentDir);
  const joined = parent ? `${parent}${name}` : name;
  return isDirectory ? `${joined}/` : joined;
}

/** 取当前选中的文件夹；若无选中文件夹则返回根目录 */
export function resolveTargetDirectoryFromSelection(
  selectedPaths: readonly string[],
): string {
  for (let index = selectedPaths.length - 1; index >= 0; index -= 1) {
    const path = selectedPaths[index];
    if (path?.endsWith('/')) {
      return path;
    }
  }
  return '';
}

export function uniqueSiblingBasename(
  siblingPaths: readonly string[],
  baseName: string,
): string {
  const taken = new Set(siblingPaths.map((path) => leafName(path)));
  if (!taken.has(baseName)) {
    return baseName;
  }
  let suffix = 2;
  while (taken.has(`${baseName} ${suffix}`)) {
    suffix += 1;
  }
  return `${baseName} ${suffix}`;
}

export function remapTreePathsForMove(
  paths: readonly string[],
  fromPath: string,
  toPath: string,
): string[] {
  const fromIsDirectory = fromPath.endsWith('/');
  const canonicalFrom = fromIsDirectory
    ? fromPath
    : fromPath.replace(/\\/g, '/');
  const canonicalTo = toPath.endsWith('/') ? toPath : toPath.replace(/\\/g, '/');
  const fromPrefix = fromIsDirectory ? canonicalFrom : null;

  const remapped = paths.map((path) => {
    if (path === canonicalFrom) {
      return canonicalTo;
    }
    if (fromPrefix && path.startsWith(fromPrefix)) {
      return `${canonicalTo}${path.slice(fromPrefix.length)}`;
    }
    return path;
  });

  return [...new Set(remapped)].sort((left, right) =>
    leafName(left).localeCompare(leafName(right), undefined, {
      sensitivity: 'base',
    }),
  );
}

/** 右键是否落在文件树某一行（含 shadow DOM 内节点） */
export function isFileTreeRowContextMenuTarget(event: Event): boolean {
  for (const node of event.composedPath()) {
    if (!(node instanceof HTMLElement)) continue;
    if (
      node.dataset.type === 'item' ||
      node.getAttribute('role') === 'treeitem'
    ) {
      return true;
    }
    if (node.dataset.fileTreeContextMenuRoot === 'true') {
      return true;
    }
  }
  return false;
}

export interface DropTarget {
  kind: 'directory' | 'root';
  directoryPath: string | null;
}

/** 与 @pierre/trees buildDropOperations 一致：解析拖放后的目标路径 */
export function resolveDropDestinationPath(
  sourcePath: string,
  target: DropTarget,
): string {
  const isDirectory = sourcePath.endsWith('/');
  const basename = leafName(sourcePath);

  if (target.kind === 'root' || target.directoryPath == null) {
    return isDirectory ? normalizeDirectoryPath(basename) : basename;
  }

  const parentDir = normalizeDirectoryPath(target.directoryPath);
  const parentWithoutSlash = parentDir.endsWith('/')
    ? parentDir.slice(0, -1)
    : parentDir;
  return joinRelativePath(parentWithoutSlash, basename, isDirectory);
}

export function buildMovesForDrop(
  draggedPaths: readonly string[],
  target: DropTarget,
): Array<{ from: string; to: string }> {
  const moves: Array<{ from: string; to: string }> = [];
  for (const from of draggedPaths) {
    const to = resolveDropDestinationPath(from, target);
    if (from !== to) {
      moves.push({ from, to });
    }
  }
  return moves;
}

export function parentDirectoryPath(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, '/');
  const parts = normalized.split('/').filter(Boolean);
  if (parts.length <= 1) {
    return '';
  }
  const isDirectory = normalized.endsWith('/');
  const dirParts = isDirectory ? parts.slice(0, -1) : parts.slice(0, -1);
  return directoryPath(dirParts);
}
