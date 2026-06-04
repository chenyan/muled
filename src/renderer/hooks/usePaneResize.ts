import { useCallback, useEffect, useRef, useState } from 'react';
import {
  clampSplitRatio,
  SPLIT_RATIO_MAX,
  SPLIT_RATIO_MIN,
} from '../../shared/editorSplit';

export interface UsePaneResizeOptions {
  enabled: boolean;
  direction: 'horizontal' | 'vertical';
  ratio: number;
  onRatioChange: (ratio: number) => void;
  onRatioCommit?: (ratio: number) => void;
}

export function usePaneResize({
  enabled,
  direction,
  ratio,
  onRatioChange,
  onRatioCommit,
}: UsePaneResizeOptions) {
  const [resizing, setResizing] = useState(false);
  const dragRef = useRef({ pointerId: -1, startPos: 0, startRatio: 0.5 });
  const containerRef = useRef<HTMLDivElement | null>(null);

  const onResizePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!enabled || event.button !== 0) {
        return;
      }
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      dragRef.current = {
        pointerId: event.pointerId,
        startPos: direction === 'horizontal' ? event.clientX : event.clientY,
        startRatio: ratio,
      };
      setResizing(true);
    },
    [direction, enabled, ratio],
  );

  const applyDelta = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const el = containerRef.current;
      if (!el) return ratio;
      const size =
        direction === 'horizontal' ? el.clientWidth : el.clientHeight;
      if (size <= 0) return ratio;
      const pos = direction === 'horizontal' ? event.clientX : event.clientY;
      const rect = el.getBoundingClientRect();
      const offset =
        direction === 'horizontal'
          ? pos - rect.left
          : pos - rect.top;
      return clampSplitRatio(offset / size);
    },
    [direction, ratio],
  );

  const onResizePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!resizing || event.pointerId !== dragRef.current.pointerId) {
        return;
      }
      onRatioChange(applyDelta(event));
    },
    [applyDelta, onRatioChange, resizing],
  );

  const finishResize = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!resizing || event.pointerId !== dragRef.current.pointerId) {
        return;
      }
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      dragRef.current.pointerId = -1;
      setResizing(false);
      const next = applyDelta(event);
      onRatioChange(next);
      onRatioCommit?.(next);
    },
    [applyDelta, onRatioChange, onRatioCommit, resizing],
  );

  useEffect(() => {
    if (!resizing) {
      return undefined;
    }
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor =
      direction === 'horizontal' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
    };
  }, [direction, resizing]);

  const ariaOrientation =
    direction === 'horizontal' ? ('vertical' as const) : ('horizontal' as const);

  return {
    resizing,
    containerRef,
    resizeHandleProps: {
      role: 'separator' as const,
      'aria-orientation': ariaOrientation,
      'aria-valuemin': SPLIT_RATIO_MIN,
      'aria-valuemax': SPLIT_RATIO_MAX,
      'aria-valuenow': ratio,
      'aria-label': '调整分区间大小',
      tabIndex: enabled ? 0 : -1,
      onPointerDown: onResizePointerDown,
      onPointerMove: onResizePointerMove,
      onPointerUp: finishResize,
      onPointerCancel: finishResize,
    },
  };
}
