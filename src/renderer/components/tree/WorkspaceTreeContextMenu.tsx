import { useCallback } from 'react';
import type { SplitPlacement } from '../../../shared/editorSplit';
import { workspaceAbsolutePath } from '../../lib/workspaceAbsolutePath';
import { pushStatusToast } from '../../lib/statusToast';
import FloatingContextMenuPortal from './FloatingContextMenuPortal';
import './WorkspaceTreeContextMenu.css';

const SPLIT_OPEN_ITEMS: { placement: SplitPlacement; label: string }[] = [
  { placement: 'left', label: '左' },
  { placement: 'right', label: '右' },
  { placement: 'top', label: '上' },
  { placement: 'bottom', label: '下' },
];

interface WorkspaceTreeContextMenuItem {
  kind: 'directory' | 'file';
  name: string;
  path: string;
}

interface WorkspaceTreeContextMenuProps {
  item: WorkspaceTreeContextMenuItem;
  workspaceRoot: string;
  anchorX: number;
  anchorY: number;
  onOpenDirectoryGrid: (relativePath: string) => void;
  onOpenFileInNewTab?: (relativePath: string) => void;
  onOpenFileInSplit?: (relativePath: string, placement: SplitPlacement) => void;
  onCreateFile: () => void;
  onCreateDirectory: () => void;
  onRenameItem: (item: WorkspaceTreeContextMenuItem) => void;
  onDeleteItem: (item: WorkspaceTreeContextMenuItem) => void;
  onClose: (options?: { restoreFocus?: boolean }) => void;
}

export default function WorkspaceTreeContextMenu({
  item,
  workspaceRoot,
  anchorX,
  anchorY,
  onOpenDirectoryGrid,
  onOpenFileInNewTab,
  onOpenFileInSplit,
  onCreateFile,
  onCreateDirectory,
  onRenameItem,
  onDeleteItem,
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

  const fileOps = (
    <>
      <button
        type="button"
        role="menuitem"
        className="WorkspaceTreeContextMenu__item"
        onClick={() => {
          onCreateFile();
          onClose();
        }}
      >
        新建
      </button>
      <button
        type="button"
        role="menuitem"
        className="WorkspaceTreeContextMenu__item"
        onClick={() => {
          onCreateDirectory();
          onClose();
        }}
      >
        新建文件夹
      </button>
      <button
        type="button"
        role="menuitem"
        className="WorkspaceTreeContextMenu__item"
        onClick={() => {
          onRenameItem(item);
          onClose({ restoreFocus: false });
        }}
      >
        重命名
      </button>
      <button
        type="button"
        role="menuitem"
        className="WorkspaceTreeContextMenu__item WorkspaceTreeContextMenu__item--danger"
        onClick={() => {
          onDeleteItem(item);
          onClose();
        }}
      >
        删除
      </button>
      <div className="WorkspaceTreeContextMenu__separator" role="separator" />
    </>
  );

  return (
    <FloatingContextMenuPortal
      x={anchorX}
      y={anchorY}
      className="WorkspaceTreeContextMenu WorkspaceTreeContextMenu--floating"
      data-file-tree-context-menu-root="true"
      role="menu"
    >
      {fileOps}
      {item.kind === 'directory' ? (
        <button
          type="button"
          role="menuitem"
          className="WorkspaceTreeContextMenu__item"
          onClick={openDirectoryGrid}
        >
          列表显示
        </button>
      ) : (
        <>
          {onOpenFileInNewTab ? (
            <button
              type="button"
              role="menuitem"
              className="WorkspaceTreeContextMenu__item"
              onClick={() => {
                onOpenFileInNewTab(item.path);
                onClose();
              }}
            >
              新tab打开
            </button>
          ) : null}
          {onOpenFileInSplit ? (
            <div className="WorkspaceTreeContextMenu__submenu">
              <div
                className="WorkspaceTreeContextMenu__submenuTrigger"
                role="menuitem"
                aria-haspopup="menu"
              >
                分隔打开
              </div>
              <div className="WorkspaceTreeContextMenu__submenuPanel" role="menu">
                {SPLIT_OPEN_ITEMS.map(({ placement, label }) => (
                  <button
                    key={placement}
                    type="button"
                    role="menuitem"
                    className="WorkspaceTreeContextMenu__item"
                    onClick={() => {
                      onOpenFileInSplit(item.path, placement);
                      onClose();
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
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
        </>
      )}
    </FloatingContextMenuPortal>
  );
}
