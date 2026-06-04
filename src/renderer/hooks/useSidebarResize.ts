import { useCallback, useEffect, useRef, useState } from 'react';
import {
  SIDEBAR_WIDTH_MAX,
  SIDEBAR_WIDTH_MIN,
} from '../../shared/constants';
import { clampSidebarWidth } from '../../shared/sidebarLayout';

export interface UseSidebarResizeOptions {
  enabled: boolean;
  width: number;
  onWidthChange: (width: number) => void;
  onWidthCommit?: (width: number) => void;
}

export function useSidebarResize({
  enabled,
  width,
  onWidthChange,
  onWidthCommit,
}: UseSidebarResizeOptions) {
  const [resizing, setResizing] = useState(false);
  const dragRef = useRef({ pointerId: -1, startX: 0, startWidth: 0 });

  const onResizePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!enabled || event.button !== 0) {
        return;
      }
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startWidth: width,
      };
      setResizing(true);
    },
    [enabled, width],
  );

  const onResizePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!resizing || event.pointerId !== dragRef.current.pointerId) {
        return;
      }
      const delta = event.clientX - dragRef.current.startX;
      onWidthChange(
        clampSidebarWidth(dragRef.current.startWidth + delta),
      );
    },
    [onWidthChange, resizing],
  );

  const finishResize = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!resizing || event.pointerId !== dragRef.current.pointerId) {
        return;
      }
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      const delta = event.clientX - dragRef.current.startX;
      const next = clampSidebarWidth(dragRef.current.startWidth + delta);
      dragRef.current.pointerId = -1;
      setResizing(false);
      onWidthChange(next);
      onWidthCommit?.(next);
    },
    [onWidthChange, onWidthCommit, resizing],
  );

  useEffect(() => {
    if (!resizing) {
      return undefined;
    }
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
    };
  }, [resizing]);

  return {
    resizing,
    resizeHandleProps: {
      role: 'separator' as const,
      'aria-orientation': 'vertical' as const,
      'aria-valuemin': SIDEBAR_WIDTH_MIN,
      'aria-valuemax': SIDEBAR_WIDTH_MAX,
      'aria-valuenow': width,
      'aria-label': '调整侧栏宽度',
      tabIndex: enabled ? 0 : -1,
      onPointerDown: onResizePointerDown,
      onPointerMove: onResizePointerMove,
      onPointerUp: finishResize,
      onPointerCancel: finishResize,
    },
  };
}
