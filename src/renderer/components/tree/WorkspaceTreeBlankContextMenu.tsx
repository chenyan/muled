import { useEffect, useRef } from 'react';
import './WorkspaceTreeContextMenu.css';

interface WorkspaceTreeBlankContextMenuProps {
  x: number;
  y: number;
  onCreateFile: () => void;
  onCreateDirectory: () => void;
  onClose: () => void;
}

export default function WorkspaceTreeBlankContextMenu({
  x,
  y,
  onCreateFile,
  onCreateDirectory,
  onClose,
}: WorkspaceTreeBlankContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const onPointerDown = (event: MouseEvent) => {
      const menu = menuRef.current;
      if (menu && !menu.contains(event.target as Node)) {
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('mousedown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('mousedown', onPointerDown);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="WorkspaceTreeContextMenu WorkspaceTreeBlankContextMenu"
      data-file-tree-context-menu-root="true"
      role="menu"
      style={{ left: x, top: y }}
    >
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
    </div>
  );
}
