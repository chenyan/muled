import { useEffect, useMemo, useRef, useState } from 'react';
import { FileTree, useFileTree } from '@pierre/trees/react';
import { formatWorkspacePathLabel } from '../../lib/formatWorkspacePathLabel';
import {
  clearFileTreeSelection,
  revealPathInFileTree,
  type FileTreeRevealModel,
} from '../../lib/workspaceTreeReveal';
import { filterWorkspacePathsByQuery } from '../../../shared/workspacePathGlob';
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
  onSwitchWorkspace: (absolutePath: string) => void;
}

interface WorkspaceTreeFileListProps {
  paths: string[];
  workspaceRoot: string;
  initialExpansionDepth: number;
  selectionResetKey: number;
  revealRequest?: WorkspaceTreeRevealRequest | null;
  onOpenFile: (relativePath: string) => void;
}

/** 工作区切换时 remount，避免 pierre/trees 在 resetPaths 后选区回调失效 */
function WorkspaceTreeFileList({
  paths,
  workspaceRoot,
  initialExpansionDepth,
  selectionResetKey,
  revealRequest,
  onOpenFile,
}: WorkspaceTreeFileListProps) {
  const onOpenFileRef = useRef(onOpenFile);
  onOpenFileRef.current = onOpenFile;
  const suppressOpenRef = useRef(false);

  const { model } = useFileTree({
    paths,
    initialExpansion: initialExpansionDepth,
    search: false,
    density: 'compact',
    onSelectionChange: (selectedPaths) => {
      if (suppressOpenRef.current) return;
      const last = selectedPaths[selectedPaths.length - 1];
      if (!last || last.endsWith('/')) {
        return;
      }
      onOpenFileRef.current(last);
    },
  });

  useEffect(() => {
    model.resetPaths(paths);
  }, [model, paths]);

  useEffect(() => {
    clearFileTreeSelection(model as FileTreeRevealModel);
  }, [model, selectionResetKey]);

  useEffect(() => {
    if (!revealRequest) return;
    suppressOpenRef.current = true;
    try {
      revealPathInFileTree(model as FileTreeRevealModel, revealRequest.treePath);
    } finally {
      queueMicrotask(() => {
        suppressOpenRef.current = false;
      });
    }
  }, [model, revealRequest]);

  return (
    <FileTree
      model={model}
      className="WorkspaceTree__tree"
      renderContextMenu={(item, context) => (
        <WorkspaceTreeContextMenu
          item={item}
          workspaceRoot={workspaceRoot}
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
  onSwitchWorkspace,
}: WorkspaceTreeProps) {
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredPaths = useMemo(
    () => filterWorkspacePathsByQuery(paths, searchQuery),
    [paths, searchQuery],
  );

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
      <label className="WorkspaceTree__search">
        <span className="visually-hidden">搜索文件</span>
        <input
          type="search"
          className="WorkspaceTree__searchInput"
          value={searchQuery}
          placeholder="搜索… 支持 glob（*.md、**/*.tsx）"
          spellCheck={false}
          disabled={pathsLoading}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
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
        className={`WorkspaceTree__treeHost${pathsLoading ? ' WorkspaceTree__treeHost--loading' : ''}`}
      >
        {pathsLoading ? (
          <div className="WorkspaceTree__treeLoading" aria-live="polite">
            加载中…
          </div>
        ) : null}
        <WorkspaceTreeFileList
          key={workspaceRoot}
          paths={filteredPaths}
          workspaceRoot={workspaceRoot}
          initialExpansionDepth={initialExpansionDepth}
          selectionResetKey={selectionResetKey}
          revealRequest={revealRequest}
          onOpenFile={onOpenFile}
        />
      </div>
    </div>
  );
}
