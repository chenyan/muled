/** @pierre/trees 目录项路径以 `/` 结尾 */
export function directoryPath(relativeParts: string[]): string {
  return `${relativeParts.join('/')}/`;
}

export type PathBreadcrumb = {
  label: string;
  /** 传给 FileTree model 的 canonical path */
  treePath: string;
};

/** 将工作区相对路径拆成可点击面包屑（目录带尾斜杠，文件不带） */
export function buildPathBreadcrumbs(relativePath: string): PathBreadcrumb[] {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
  const parts = normalized.split('/').filter(Boolean);
  const pathIsDirectory = normalized.endsWith('/');

  return parts.map((label, index) => {
    const joined = parts.slice(0, index + 1).join('/');
    const isFile =
      index === parts.length - 1 && !pathIsDirectory;
    return {
      label,
      treePath: isFile ? joined : directoryPath(parts.slice(0, index + 1)),
    };
  });
}

/** 需要展开以显示 target 的全部祖先目录（含 target 本身若为目录） */
export function ancestorDirectoryPaths(treePath: string): string[] {
  const normalized = treePath.replace(/\\/g, '/');
  const isDirectory = normalized.endsWith('/');
  const parts = normalized.split('/').filter(Boolean);
  const dirCount = isDirectory ? parts.length : Math.max(0, parts.length - 1);
  const dirs: string[] = [];
  for (let i = 0; i < dirCount; i += 1) {
    dirs.push(directoryPath(parts.slice(0, i + 1)));
  }
  return dirs;
}

type TreeDirectoryItem = {
  isDirectory(): boolean;
  expand(): void;
};

type TreeSelectableItem = {
  select(): void;
  deselect(): void;
};

export type FileTreeRevealModel = {
  getItem(path: string): (TreeDirectoryItem & TreeSelectableItem) | null;
  getSelectedPaths(): readonly string[];
  scrollToPath(
    path: string,
    options?: { focus?: boolean; offset?: 'top' | 'center' | 'nearest' },
  ): void;
};

export function clearFileTreeSelection(model: FileTreeRevealModel): void {
  model.getSelectedPaths().forEach((path) => {
    model.getItem(path)?.deselect();
  });
}

/** 展开祖先、选中目标并滚动到可见区域 */
export function revealPathInFileTree(
  model: FileTreeRevealModel,
  treePath: string,
): boolean {
  const normalized = treePath.replace(/\\/g, '/');
  for (const dirPath of ancestorDirectoryPaths(normalized)) {
    const dir = model.getItem(dirPath);
    if (dir?.isDirectory()) {
      dir.expand();
    }
  }

  const target = model.getItem(normalized);
  if (!target) return false;

  clearFileTreeSelection(model);
  target.select();
  model.scrollToPath(normalized, { focus: false, offset: 'nearest' });
  return true;
}
