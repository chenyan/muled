import { useEffect, useRef } from 'react';
import FloatingContextMenuPortal from './FloatingContextMenuPortal';
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
    <FloatingContextMenuPortal
      ref={menuRef}
      x={x}
      y={y}
      className="WorkspaceTreeContextMenu WorkspaceTreeBlankContextMenu WorkspaceTreeContextMenu--floating"
      data-file-tree-context-menu-root="true"
      role="menu"
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
    </FloatingContextMenuPortal>
  );
}
