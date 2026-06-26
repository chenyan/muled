import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

export interface UseHorizontalDragSizeOptions {
  value: number;
  min: number;
  max: number;
  /** 动态上限，优先于 max */
  resolveMax?: () => number;
  onChange: (next: number) => void;
  /** 拖拽过程中直接改 DOM 宽度 */
  liveTargetRef?: RefObject<HTMLElement | null>;
  /** 拖拽柄在目标左侧时设为 true（向左拖增宽） */
  invertDelta?: boolean;
  ariaLabel?: string;
  onDragStart?: () => void;
  onDragEnd?: (finalValue: number) => void;
}

export function useHorizontalDragSize({
  value,
  min,
  max,
  resolveMax,
  onChange,
  liveTargetRef,
  invertDelta = false,
  ariaLabel = '调整宽度',
  onDragStart,
  onDragEnd,
}: UseHorizontalDragSizeOptions) {
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ pointerId: -1, startX: 0, startValue: value });
  const pendingValueRef = useRef(value);
  pendingValueRef.current = value;

  const clamp = useCallback(
    (next: number) => {
      const upper = resolveMax?.() ?? max;
      return Math.min(upper, Math.max(min, next));
    },
    [max, min, resolveMax],
  );

  const applyLiveWidth = useCallback(
    (next: number) => {
      pendingValueRef.current = next;
      if (liveTargetRef?.current) {
        liveTargetRef.current.style.width = `${next}px`;
      }
    },
    [liveTargetRef],
  );

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startValue: value,
      };
      pendingValueRef.current = value;
      setDragging(true);
      onDragStart?.();
    },
    [onDragStart, value],
  );

  const deltaFromEvent = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const raw = event.clientX - dragRef.current.startX;
      return invertDelta ? -raw : raw;
    },
    [invertDelta],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging || event.pointerId !== dragRef.current.pointerId) return;
      const next = clamp(dragRef.current.startValue + deltaFromEvent(event));
      if (liveTargetRef) {
        applyLiveWidth(next);
      } else {
        onChange(next);
      }
    },
    [applyLiveWidth, clamp, deltaFromEvent, dragging, liveTargetRef, onChange],
  );

  const finishDrag = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging || event.pointerId !== dragRef.current.pointerId) return;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      dragRef.current.pointerId = -1;
      const finalValue = clamp(
        dragRef.current.startValue + deltaFromEvent(event),
      );
      setDragging(false);
      onChange(finalValue);
      onDragEnd?.(finalValue);
    },
    [clamp, deltaFromEvent, dragging, onChange, onDragEnd],
  );

  useEffect(() => {
    if (!dragging) return undefined;
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
    };
  }, [dragging]);

  return {
    dragging,
    handleProps: {
      role: 'separator' as const,
      'aria-orientation': 'vertical' as const,
      'aria-valuemin': min,
      'aria-valuemax': max,
      'aria-valuenow': value,
      'aria-label': ariaLabel,
      tabIndex: 0,
      onPointerDown,
      onPointerMove,
      onPointerUp: finishDrag,
      onPointerCancel: finishDrag,
    },
  };
}
