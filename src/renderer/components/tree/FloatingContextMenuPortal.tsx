import {
  forwardRef,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { clampFloatingMenuPosition } from '../../lib/clampFloatingMenuPosition';

interface FloatingContextMenuPortalProps {
  x: number;
  y: number;
  className?: string;
  role?: string;
  children: ReactNode;
  'data-file-tree-context-menu-root'?: string;
}

const FloatingContextMenuPortal = forwardRef<
  HTMLDivElement,
  FloatingContextMenuPortalProps
>(function FloatingContextMenuPortal(
  {
    x,
    y,
    className,
    role,
    children,
    'data-file-tree-context-menu-root': contextMenuRoot,
  },
  forwardedRef,
) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: x, top: y });

  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) {
      setPosition({ left: x, top: y });
      return;
    }
    const rect = menu.getBoundingClientRect();
    setPosition(
      clampFloatingMenuPosition(x, y, rect.width, rect.height),
    );
  }, [x, y]);

  const setMenuRef = (node: HTMLDivElement | null) => {
    menuRef.current = node;
    if (typeof forwardedRef === 'function') {
      forwardedRef(node);
    } else if (forwardedRef) {
      forwardedRef.current = node;
    }
  };

  const style: CSSProperties = {
    left: position.left,
    top: position.top,
  };

  return createPortal(
    <div
      ref={setMenuRef}
      className={className}
      data-file-tree-context-menu-root={contextMenuRoot}
      role={role}
      style={style}
    >
      {children}
    </div>,
    document.body,
  );
});

export default FloatingContextMenuPortal;
