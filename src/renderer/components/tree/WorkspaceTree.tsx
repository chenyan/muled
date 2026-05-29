import { useEffect, useMemo, useState } from 'react';
import { FileTree, useFileTree } from '@pierre/trees/react';
import { formatWorkspacePathLabel } from '../../lib/formatWorkspacePathLabel';
import { filterWorkspacePathsByQuery } from '../../../shared/workspacePathGlob';

interface WorkspaceTreeProps {
  paths: string[];
  workspaceRoot: string;
  homeDir: string;
  recentWorkspaces: string[];
  /** @pierre/trees initialExpansion 深度（非负整数） */
  initialExpansionDepth: number;
  /** 递增时清除树选中，以便再次点击同一文件仍能触发打开 */
  selectionResetKey: number;
  onOpenFile: (relativePath: string) => void;
  onSwitchWorkspace: (absolutePath: string) => void;
}

function clearTreeSelection(model: ReturnType<typeof useFileTree>['model']) {
  const { getSelectedPaths } = model as {
    getSelectedPaths?: () => readonly string[];
  };
  if (typeof getSelectedPaths !== 'function') return;
  getSelectedPaths.call(model).forEach((path) => {
    model.getItem(path)?.deselect();
  });
}

export default function WorkspaceTree({
  paths,
  workspaceRoot,
  homeDir,
  recentWorkspaces,
  initialExpansionDepth,
  selectionResetKey,
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

  const { model } = useFileTree({
    paths: filteredPaths,
    initialExpansion: initialExpansionDepth,
    search: false,
    density: 'compact',
    onSelectionChange: (selectedPaths) => {
      const last = selectedPaths[selectedPaths.length - 1];
      if (!last || last.endsWith('/')) {
        return;
      }
      onOpenFile(last);
    },
  });

  useEffect(() => {
    model.resetPaths(filteredPaths);
  }, [model, filteredPaths]);

  useEffect(() => {
    clearTreeSelection(model);
  }, [model, selectionResetKey]);

  return (
    <div className="WorkspaceTree">
      <label className="WorkspaceTree__root">
        <span className="visually-hidden">工作区路径</span>
        <select
          className="WorkspaceTree__rootSelect"
          value={workspaceRoot}
          title={workspaceRoot}
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
          onChange={(event) => setSearchQuery(event.target.value)}
        />
      </label>
      <FileTree model={model} className="WorkspaceTree__tree" />
    </div>
  );
}
