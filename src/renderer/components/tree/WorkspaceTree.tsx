import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWheelScrollOnlyWhenGestureStartsIn } from '../../lib/wheelScrollOnlyWhenGestureStartsIn';
import { FileTree, useFileTree } from '@pierre/trees/react';
import type { FileTreeRenameEvent } from '@pierre/trees';
import { formatWorkspacePathLabel } from '../../lib/formatWorkspacePathLabel';
import {
  ancestorDirectoryPaths,
  clearFileTreeSelection,
  revealPathInFileTree,
  type FileTreeRevealModel,
} from '../../lib/workspaceTreeReveal';
import {
  isFileTreeRowContextMenuTarget,
  joinRelativePath,
  normalizeDirectoryPath,
  parentDirectoryPath,
  remapTreePathsForMove,
  resolveTargetDirectoryFromSelection,
  uniqueSiblingBasename,
} from '../../lib/workspaceTreeFileOps';
import { pushStatusToast } from '../../lib/statusToast';
import type { SplitPlacement } from '../../../shared/editorSplit';
import WorkspaceTreeContextMenu from './WorkspaceTreeContextMenu';
import WorkspaceTreeBlankContextMenu from './WorkspaceTreeBlankContextMenu';
import WorkspaceHistoryDialog from '../dialog/WorkspaceHistoryDialog';

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
  onOpenFileInSplit?: (relativePath: string, placement: SplitPlacement) => void;
  onOpenDirectoryGrid: (relativePath: string) => void;
  onSwitchWorkspace: (absolutePath: string) => void;
  onWorkspaceHistoryChanged?: (pickerPaths: string[]) => void;
}

interface WorkspaceTreeFileListProps {
  paths: string[];
  workspaceRoot: string;
  initialExpansionDepth: number;
  selectionResetKey: number;
  revealRequest?: WorkspaceTreeRevealRequest | null;
  onOpenFile: (relativePath: string) => void;
  onOpenFileInSplit?: (relativePath: string, placement: SplitPlacement) => void;
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
  onOpenFileInSplit,
  onOpenDirectoryGrid,
}: WorkspaceTreeFileListProps) {
  const onOpenFileRef = useRef(onOpenFile);
  onOpenFileRef.current = onOpenFile;
  const suppressOpenRef = useRef(false);
  const loadedDirsRef = useRef(new Set<string>());
  const loadedChildrenRef = useRef(new Map<string, string[]>());
  const inFlightLoadsRef = useRef(new Map<string, Promise<string[]>>());
  const expandedDirsSnapshotRef = useRef(new Set<string>());
  const knownModelPathsRef = useRef(new Set<string>(paths));
  const pendingRenameCreatesRef = useRef(new Set<string>());
  const renamingSessionPathRef = useRef<string | null>(null);
  const modelRef = useRef<ReturnType<typeof useFileTree>['model'] | null>(null);
  const [treePaths, setTreePaths] = useState<string[]>(paths);
  const [blankContextMenu, setBlankContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const invalidateDirectoryCache = useCallback((directoryPath: string) => {
    const normalized = normalizeDirectoryPath(directoryPath);
    loadedDirsRef.current.delete(normalized);
    loadedChildrenRef.current.delete(normalized);
  }, []);

  const syncTreePathsAfterMove = useCallback((fromPath: string, toPath: string) => {
    setTreePaths((prev) => remapTreePathsForMove(prev, fromPath, toPath));
    const nextKnown = remapTreePathsForMove(
      [...knownModelPathsRef.current],
      fromPath,
      toPath,
    );
    knownModelPathsRef.current = new Set(nextKnown);

    for (const [dirPath, children] of loadedChildrenRef.current.entries()) {
      loadedChildrenRef.current.set(
        dirPath,
        remapTreePathsForMove(children, fromPath, toPath),
      );
    }

    invalidateDirectoryCache(parentDirectoryPath(fromPath));
    invalidateDirectoryCache(parentDirectoryPath(toPath));
  }, [invalidateDirectoryCache]);

  const appendPathsToModel = useCallback((newPaths: string[]) => {
    const treeModel = modelRef.current;
    if (!treeModel) return;
    const toAdd = newPaths.filter((path) => !knownModelPathsRef.current.has(path));
    if (toAdd.length === 0) return;
    if (toAdd.length === 1) {
      treeModel.add(toAdd[0]!);
    } else {
      treeModel.batch(toAdd.map((path) => ({ type: 'add' as const, path })));
    }
    for (const path of toAdd) {
      knownModelPathsRef.current.add(path);
    }
  }, []);

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
          appendPathsToModel(children);
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
    [appendPathsToModel, mergePaths],
  );

  const endRenamingSession = useCallback((relativePath: string) => {
    pendingRenameCreatesRef.current.delete(relativePath);
    if (renamingSessionPathRef.current === relativePath) {
      renamingSessionPathRef.current = null;
    }
  }, []);

  const persistRename = useCallback(async (event: FileTreeRenameEvent) => {
    const { sourcePath, destinationPath } = event;
    endRenamingSession(sourcePath);
    if (sourcePath === destinationPath) {
      return;
    }

    try {
      await window.muled.workspace.rename({
        from: sourcePath,
        to: destinationPath,
      });
      invalidateDirectoryCache(parentDirectoryPath(destinationPath));
    } catch (error) {
      const treeModel = modelRef.current;
      if (treeModel) {
        treeModel.move(destinationPath, sourcePath);
      }
      pushStatusToast(
        error instanceof Error ? error.message : String(error),
        'error',
      );
    }
  }, [endRenamingSession, invalidateDirectoryCache]);

  const createPlaceholder = useCallback(
    async (isDirectory: boolean, explicitParentDir?: string) => {
      const treeModel = modelRef.current;
      if (!treeModel) return;

      const parentDir =
        explicitParentDir !== undefined
          ? explicitParentDir
          : resolveTargetDirectoryFromSelection(treeModel.getSelectedPaths());
      const normalizedParent = normalizeDirectoryPath(parentDir);

      if (normalizedParent) {
        const dirItem = treeModel.getItem(normalizedParent);
        dirItem?.expand();
        await ensureChildrenLoaded(normalizedParent);
      }

      const siblingPaths =
        loadedChildrenRef.current.get(normalizedParent) ??
        (await window.muled.workspace.listChildren(normalizedParent)).paths;
      const baseName = uniqueSiblingBasename(
        siblingPaths,
        isDirectory ? '新建文件夹' : '未命名',
      );
      const placeholderPath = joinRelativePath(parentDir, baseName, isDirectory);

      try {
        if (isDirectory) {
          await window.muled.workspace.createDirectory(placeholderPath);
        } else {
          await window.muled.workspace.createFile(placeholderPath);
        }
      } catch (error) {
        pushStatusToast(
          error instanceof Error ? error.message : String(error),
          'error',
        );
        return;
      }

      appendPathsToModel([placeholderPath]);
      setTreePaths((prev) => mergePaths(prev, [placeholderPath]));
      pendingRenameCreatesRef.current.add(placeholderPath);
      renamingSessionPathRef.current = placeholderPath;

      if (normalizedParent) {
        loadedChildrenRef.current.set(
          normalizedParent,
          mergePaths(
            loadedChildrenRef.current.get(normalizedParent) ?? [],
            [placeholderPath],
          ),
        );
      }

      if (
        treeModel.startRenaming(placeholderPath, { removeIfCanceled: true }) ===
        false
      ) {
        endRenamingSession(placeholderPath);
        treeModel.remove(
          placeholderPath,
          isDirectory ? { recursive: true } : undefined,
        );
        try {
          await window.muled.workspace.delete(placeholderPath);
        } catch {
          /* remove 失败时仍提示上方错误 */
        }
        pushStatusToast('无法开始重命名', 'error');
      }
    },
    [
      appendPathsToModel,
      endRenamingSession,
      ensureChildrenLoaded,
      mergePaths,
    ],
  );

  const renameTreeItem = useCallback((relativePath: string) => {
    const treeModel = modelRef.current;
    if (!treeModel) return;
    if (treeModel.startRenaming(relativePath) === false) {
      pushStatusToast('无法开始重命名', 'error');
    }
  }, []);

  const { model } = useFileTree({
    paths: treePaths,
    initialExpansion: initialExpansionDepth,
    search: false,
    density: 'compact',
    renaming: {
      onRename: (event) => {
        void persistRename(event);
      },
      onError: (error) => {
        pushStatusToast(error, 'error');
      },
    },
    onSelectionChange: (selectedPaths) => {
      if (suppressOpenRef.current) return;
      const last = selectedPaths[selectedPaths.length - 1];
      if (!last) {
        return;
      }
      if (last.endsWith('/')) {
        // 展开/折叠由 @pierre/trees 行点击 toggle 处理；懒加载见下方 subscribe。
        return;
      }
      if (
        renamingSessionPathRef.current === last ||
        pendingRenameCreatesRef.current.has(last)
      ) {
        return;
      }
      onOpenFileRef.current(last);
    },
  });
  modelRef.current = model;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const sessionPath = renamingSessionPathRef.current;
      if (!sessionPath || event.key !== 'Enter') {
        return;
      }
      queueMicrotask(() => {
        if (renamingSessionPathRef.current === sessionPath) {
          endRenamingSession(sessionPath);
        }
      });
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [endRenamingSession]);

  useEffect(() => {
    return model.onMutation('move', (event) => {
      syncTreePathsAfterMove(event.from, event.to);
    });
  }, [model, syncTreePathsAfterMove]);

  useEffect(() => {
    return model.onMutation('remove', (event) => {
      const removedPath = event.path;
      if (pendingRenameCreatesRef.current.has(removedPath)) {
        pendingRenameCreatesRef.current.delete(removedPath);
        if (renamingSessionPathRef.current === removedPath) {
          renamingSessionPathRef.current = null;
        }
        void window.muled.workspace.delete(removedPath).catch((error) => {
          pushStatusToast(
            error instanceof Error ? error.message : String(error),
            'error',
          );
        });
        invalidateDirectoryCache(parentDirectoryPath(removedPath));
      }
      knownModelPathsRef.current.delete(removedPath);
      setTreePaths((prev) => prev.filter((path) => path !== removedPath));
    });
  }, [invalidateDirectoryCache, model]);

  useEffect(() => {
    loadedDirsRef.current = new Set<string>();
    loadedChildrenRef.current = new Map<string, string[]>();
    inFlightLoadsRef.current = new Map<string, Promise<string[]>>();
    expandedDirsSnapshotRef.current = new Set();
    knownModelPathsRef.current = new Set(paths);
    pendingRenameCreatesRef.current = new Set();
    renamingSessionPathRef.current = null;
    setTreePaths(paths);
    model.resetPaths(paths);
    void ensureChildrenLoaded('');
  }, [ensureChildrenLoaded, model, paths, workspaceRoot]);

  useEffect(() => {
    const syncExpandedDirectoryLoads = () => {
      if (suppressOpenRef.current) return;
      const previousExpanded = expandedDirsSnapshotRef.current;
      const nextExpanded = new Set<string>();
      for (const path of treePaths) {
        if (!path.endsWith('/')) continue;
        const item = (model as FileTreeRevealModel).getItem(path);
        if (!item?.isDirectory()) continue;
        if (item.isExpanded()) {
          nextExpanded.add(path);
          if (!previousExpanded.has(path)) {
            void ensureChildrenLoaded(path);
          }
        }
      }
      expandedDirsSnapshotRef.current = nextExpanded;
    };

    syncExpandedDirectoryLoads();
    return model.subscribe(syncExpandedDirectoryLoads);
  }, [ensureChildrenLoaded, model, treePaths]);

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

  const handleBlankContextMenu = useCallback((event: React.MouseEvent) => {
    if (isFileTreeRowContextMenuTarget(event.nativeEvent)) {
      return;
    }
    event.preventDefault();
    setBlankContextMenu({ x: event.clientX, y: event.clientY });
  }, []);

  return (
    <>
      <div
        className="WorkspaceTree__treeWrap"
        onContextMenu={handleBlankContextMenu}
      >
        <FileTree
          model={model}
          className="WorkspaceTree__tree"
          renderContextMenu={(item, context) => (
            <WorkspaceTreeContextMenu
              item={item}
              workspaceRoot={workspaceRoot}
              onOpenDirectoryGrid={onOpenDirectoryGrid}
              onOpenFileInSplit={onOpenFileInSplit}
              onCreateFile={() => {
                void createPlaceholder(false);
              }}
              onCreateDirectory={() => {
                void createPlaceholder(true);
              }}
              onRenameItem={(menuItem) => {
                renameTreeItem(menuItem.path);
              }}
              onClose={context.close}
            />
          )}
        />
      </div>
      {blankContextMenu ? (
        <WorkspaceTreeBlankContextMenu
          x={blankContextMenu.x}
          y={blankContextMenu.y}
          onCreateFile={() => {
            void createPlaceholder(false, '');
          }}
          onCreateDirectory={() => {
            void createPlaceholder(true, '');
          }}
          onClose={() => {
            setBlankContextMenu(null);
          }}
        />
      ) : null}
    </>
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
  onOpenFileInSplit,
  onOpenDirectoryGrid,
  onSwitchWorkspace,
  onWorkspaceHistoryChanged,
}: WorkspaceTreeProps) {
  const treeHostRef = useRef<HTMLDivElement>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
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
      <div className="WorkspaceTree__root">
        <label className="WorkspaceTree__rootLabel">
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
        {onRetryWorkspace ? (
          <button
            type="button"
            className={`WorkspaceTree__iconBtn${pathsLoading ? ' WorkspaceTree__iconBtn--spinning' : ''}`}
            title="刷新文件树"
            aria-label="刷新文件树"
            disabled={pathsLoading}
            onClick={onRetryWorkspace}
          >
            <svg
              className="WorkspaceTree__refreshIcon"
              viewBox="0 0 24 24"
              width="14"
              height="14"
              aria-hidden
            >
              <path
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8M21 3v5h-5"
              />
            </svg>
          </button>
        ) : null}
        <button
          type="button"
          className="WorkspaceTree__iconBtn"
          title="编辑工作目录历史"
          aria-label="编辑工作目录历史"
          disabled={pathsLoading}
          onClick={() => setHistoryDialogOpen(true)}
        >
          <svg
            className="WorkspaceTree__toolbarIcon"
            viewBox="0 0 24 24"
            width="14"
            height="14"
            aria-hidden
          >
            <path
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8M3 3v5h5M12 7v5l4 2"
            />
          </svg>
        </button>
      </div>
      <WorkspaceHistoryDialog
        open={historyDialogOpen}
        homeDir={homeDir}
        onClose={() => setHistoryDialogOpen(false)}
        onChanged={(pickerPaths) => {
          onWorkspaceHistoryChanged?.(pickerPaths);
        }}
      />
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
          onOpenFileInSplit={onOpenFileInSplit}
          onOpenDirectoryGrid={onOpenDirectoryGrid}
        />
      </div>
    </div>
  );
}
