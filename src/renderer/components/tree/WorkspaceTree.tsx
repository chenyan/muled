import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWheelScrollOnlyWhenGestureStartsIn } from '../../lib/wheelScrollOnlyWhenGestureStartsIn';
import { FileTree, useFileTree } from '@pierre/trees/react';
import { formatWorkspacePathLabel } from '../../lib/formatWorkspacePathLabel';
import {
  ancestorDirectoryPaths,
  clearFileTreeSelection,
  revealPathInFileTree,
  type FileTreeRevealModel,
} from '../../lib/workspaceTreeReveal';
import WorkspaceTreeContextMenu from './WorkspaceTreeContextMenu';

export type WorkspaceTreeRevealRequest = {
  treePath: string;
  nonce: number;
};

interface WorkspaceTreeProps {
  paths: string[];
  workspaceRoot: string;
  homeDir: string;
  recentWorkspaces: string[];
  /** @pierre/trees initialExpansion 深度（非负整数） */
  initialExpansionDepth: number;
  pathsLoading?: boolean;
  workspaceError?: string | null;
  onRetryWorkspace?: () => void;
  /** 递增时清除树选中，以便再次点击同一文件仍能触发打开 */
  selectionResetKey: number;
  /** 状态栏路径点击等：在树中展开并选中，不重复打开文件 */
  revealRequest?: WorkspaceTreeRevealRequest | null;
  onOpenFile: (relativePath: string) => void;
  onOpenDirectoryGrid: (relativePath: string) => void;
  onSwitchWorkspace: (absolutePath: string) => void;
}

interface WorkspaceTreeFileListProps {
  paths: string[];
  workspaceRoot: string;
  initialExpansionDepth: number;
  selectionResetKey: number;
  revealRequest?: WorkspaceTreeRevealRequest | null;
  onOpenFile: (relativePath: string) => void;
  onOpenDirectoryGrid: (relativePath: string) => void;
}

/** 工作区切换时 remount，避免 pierre/trees 在 resetPaths 后选区回调失效 */
function WorkspaceTreeFileList({
  paths,
  workspaceRoot,
  initialExpansionDepth,
  selectionResetKey,
  revealRequest,
  onOpenFile,
  onOpenDirectoryGrid,
}: WorkspaceTreeFileListProps) {
  const onOpenFileRef = useRef(onOpenFile);
  onOpenFileRef.current = onOpenFile;
  const suppressOpenRef = useRef(false);
  const loadedDirsRef = useRef(new Set<string>());
  const loadedChildrenRef = useRef(new Map<string, string[]>());
  const inFlightLoadsRef = useRef(new Map<string, Promise<string[]>>());
  const pendingExpandDirsRef = useRef(new Set<string>());
  const [treePaths, setTreePaths] = useState<string[]>(paths);

  const mergePaths = useCallback((prevPaths: string[], nextPaths: string[]) => {
    if (nextPaths.length === 0) return prevPaths;
    const merged = new Set(prevPaths);
    let changed = false;
    for (const path of nextPaths) {
      if (!merged.has(path)) {
        merged.add(path);
        changed = true;
      }
    }
    if (!changed) return prevPaths;
    return [...merged].sort();
  }, []);

  const ensureChildrenLoaded = useCallback(
    async (directoryPath: string): Promise<string[]> => {
      const normalized =
        directoryPath === ''
          ? ''
          : directoryPath.endsWith('/')
            ? directoryPath
            : `${directoryPath}/`;
      if (loadedDirsRef.current.has(normalized)) {
        return loadedChildrenRef.current.get(normalized) ?? [];
      }
      const inFlight = inFlightLoadsRef.current.get(normalized);
      if (inFlight) return inFlight;

      const loadPromise = window.muled.workspace
        .listChildren(normalized)
        .then(({ paths: children }) => {
          // listChildren 完成后会触发 resetPaths，这里记录需要恢复展开态的目录。
          pendingExpandDirsRef.current.add(normalized);
          setTreePaths((prev) => mergePaths(prev, children));
          loadedDirsRef.current.add(normalized);
          loadedChildrenRef.current.set(normalized, children);
          return children;
        })
        .finally(() => {
          inFlightLoadsRef.current.delete(normalized);
        });

      inFlightLoadsRef.current.set(normalized, loadPromise);
      return loadPromise;
    },
    [mergePaths],
  );

  const { model } = useFileTree({
    paths: treePaths,
    initialExpansion: initialExpansionDepth,
    search: false,
    density: 'compact',
    onSelectionChange: (selectedPaths) => {
      if (suppressOpenRef.current) return;
      const last = selectedPaths[selectedPaths.length - 1];
      if (!last) {
        return;
      }
      if (last.endsWith('/')) {
        // 首次点击目录时先立刻展开，再异步加载子项，避免“点第二次才展开”的体感。
        const dir = (model as FileTreeRevealModel).getItem(last);
        if (dir?.isDirectory()) {
          dir.expand();
        }
        void ensureChildrenLoaded(last);
        return;
      }
      onOpenFileRef.current(last);
    },
  });

  useEffect(() => {
    loadedDirsRef.current = new Set<string>();
    loadedChildrenRef.current = new Map<string, string[]>();
    inFlightLoadsRef.current = new Map<string, Promise<string[]>>();
    setTreePaths(paths);
    void ensureChildrenLoaded('');
  }, [ensureChildrenLoaded, paths, workspaceRoot]);

  useEffect(() => {
    model.resetPaths(treePaths);
    if (pendingExpandDirsRef.current.size > 0) {
      pendingExpandDirsRef.current.forEach((dirPath) => {
        const dir = (model as FileTreeRevealModel).getItem(dirPath);
        if (dir?.isDirectory()) {
          dir.expand();
        }
      });
      pendingExpandDirsRef.current.clear();
    }
  }, [model, treePaths]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      let currentDirs = [''];
      for (let depth = 0; depth < initialExpansionDepth; depth += 1) {
        const nextDirs: string[] = [];
        await Promise.all(
          currentDirs.map(async (dir) => {
            if (cancelled) return;
            const children = await ensureChildrenLoaded(dir);
            for (const child of children) {
              if (child.endsWith('/')) {
                nextDirs.push(child);
              }
            }
          }),
        );
        currentDirs = nextDirs;
        if (currentDirs.length === 0 || cancelled) {
          break;
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [ensureChildrenLoaded, initialExpansionDepth, workspaceRoot]);

  useEffect(() => {
    clearFileTreeSelection(model as FileTreeRevealModel);
  }, [model, selectionResetKey]);

  useEffect(() => {
    if (!revealRequest) return;
    let cancelled = false;
    const run = async () => {
      suppressOpenRef.current = true;
      try {
        const targetPath = revealRequest.treePath.replace(/\\/g, '/');
        const dirs = ancestorDirectoryPaths(targetPath);
        for (const dir of dirs) {
          if (cancelled) return;
          await ensureChildrenLoaded(dir);
        }
        if (!cancelled) {
          revealPathInFileTree(model as FileTreeRevealModel, targetPath);
        }
      } finally {
        queueMicrotask(() => {
          suppressOpenRef.current = false;
        });
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [ensureChildrenLoaded, model, revealRequest]);

  return (
    <FileTree
      model={model}
      className="WorkspaceTree__tree"
      renderContextMenu={(item, context) => (
        <WorkspaceTreeContextMenu
          item={item}
          workspaceRoot={workspaceRoot}
          onOpenDirectoryGrid={onOpenDirectoryGrid}
          onClose={context.close}
        />
      )}
    />
  );
}

export default function WorkspaceTree({
  paths,
  workspaceRoot,
  homeDir,
  recentWorkspaces,
  initialExpansionDepth,
  pathsLoading = false,
  workspaceError = null,
  onRetryWorkspace,
  selectionResetKey,
  revealRequest,
  onOpenFile,
  onOpenDirectoryGrid,
  onSwitchWorkspace,
}: WorkspaceTreeProps) {
  const treeHostRef = useRef<HTMLDivElement>(null);
  useWheelScrollOnlyWhenGestureStartsIn(treeHostRef);

  const workspaceOptions = useMemo(() => {
    const seen = new Set<string>();
    const ordered: string[] = [];
    for (const entry of [workspaceRoot, ...recentWorkspaces]) {
      if (!entry || seen.has(entry)) continue;
      seen.add(entry);
      ordered.push(entry);
    }
    return ordered;
  }, [workspaceRoot, recentWorkspaces]);

  return (
    <div className="WorkspaceTree">
      <label className="WorkspaceTree__root">
        <span className="visually-hidden">工作区路径</span>
        <select
          className="WorkspaceTree__rootSelect"
          value={workspaceRoot}
          title={workspaceRoot}
          disabled={pathsLoading}
          onChange={(event) => {
            const next = event.target.value;
            if (next && next !== workspaceRoot) {
              onSwitchWorkspace(next);
            }
          }}
        >
          {workspaceOptions.map((absolutePath) => (
            <option key={absolutePath} value={absolutePath}>
              {formatWorkspacePathLabel(absolutePath, homeDir)}
            </option>
          ))}
        </select>
      </label>
      {workspaceError ? (
        <div className="WorkspaceTree__error" role="alert">
          <span>{workspaceError}</span>
          {onRetryWorkspace ? (
            <button type="button" onClick={onRetryWorkspace}>
              重试
            </button>
          ) : null}
        </div>
      ) : null}
      <div
        ref={treeHostRef}
        className={`WorkspaceTree__treeHost${pathsLoading ? ' WorkspaceTree__treeHost--loading' : ''}`}
      >
        {pathsLoading ? (
          <div className="WorkspaceTree__treeLoading" aria-live="polite">
            加载中…
          </div>
        ) : null}
        <WorkspaceTreeFileList
          key={workspaceRoot}
          paths={paths}
          workspaceRoot={workspaceRoot}
          initialExpansionDepth={initialExpansionDepth}
          selectionResetKey={selectionResetKey}
          revealRequest={revealRequest}
          onOpenFile={onOpenFile}
          onOpenDirectoryGrid={onOpenDirectoryGrid}
        />
      </div>
    </div>
  );
}
