import { useCallback } from 'react';
import { workspaceAbsolutePath } from '../../lib/workspaceAbsolutePath';
import { pushStatusToast } from '../../lib/statusToast';
import './WorkspaceTreeContextMenu.css';

interface WorkspaceTreeContextMenuItem {
  kind: 'directory' | 'file';
  name: string;
  path: string;
}

interface WorkspaceTreeContextMenuProps {
  item: WorkspaceTreeContextMenuItem;
  workspaceRoot: string;
  onOpenDirectoryGrid: (relativePath: string) => void;
  onClose: () => void;
}

export default function WorkspaceTreeContextMenu({
  item,
  workspaceRoot,
  onOpenDirectoryGrid,
  onClose,
}: WorkspaceTreeContextMenuProps) {
  const copyAbsolutePath = useCallback(async () => {
    const absolutePath = workspaceAbsolutePath(workspaceRoot, item.path);
    try {
      await navigator.clipboard.writeText(absolutePath);
      pushStatusToast('已复制绝对路径', 'success');
    } catch {
      pushStatusToast('复制失败', 'error');
    }
    onClose();
  }, [item.path, onClose, workspaceRoot]);

  const openDirectoryGrid = useCallback(() => {
    const dirPath = item.path.endsWith('/') ? item.path : `${item.path}/`;
    onOpenDirectoryGrid(dirPath);
    onClose();
  }, [item.path, onClose, onOpenDirectoryGrid]);

  if (item.kind === 'directory') {
    return (
      <div
        className="WorkspaceTreeContextMenu"
        data-file-tree-context-menu-root="true"
        role="menu"
      >
        <button
          type="button"
          role="menuitem"
          className="WorkspaceTreeContextMenu__item"
          onClick={openDirectoryGrid}
        >
          列表显示
        </button>
      </div>
    );
  }

  return (
    <div
      className="WorkspaceTreeContextMenu"
      data-file-tree-context-menu-root="true"
      role="menu"
    >
      <div className="WorkspaceTreeContextMenu__submenu">
        <div
          className="WorkspaceTreeContextMenu__submenuTrigger"
          role="menuitem"
          aria-haspopup="menu"
        >
          复制路径
        </div>
        <div className="WorkspaceTreeContextMenu__submenuPanel" role="menu">
          <button
            type="button"
            role="menuitem"
            className="WorkspaceTreeContextMenu__item"
            onClick={() => {
              void copyAbsolutePath();
            }}
          >
            绝对路径
          </button>
        </div>
      </div>
    </div>
  );
}
