import { useEffect, type RefObject } from 'react';

export const WHEEL_GESTURE_IDLE_MS = 150;

export function isPointerInElement(
  event: Pick<WheelEvent, 'clientX' | 'clientY'>,
  element: HTMLElement,
): boolean {
  const { left, right, top, bottom } = element.getBoundingClientRect();
  return (
    event.clientX >= left &&
    event.clientX <= right &&
    event.clientY >= top &&
    event.clientY <= bottom
  );
}

export type WheelGestureTracker = {
  noteWheel(isInBoundary: boolean): void;
  shouldAllowBoundaryScroll(): boolean;
  dispose(): void;
};

export function createWheelGestureTracker(
  idleMs = WHEEL_GESTURE_IDLE_MS,
): WheelGestureTracker {
  let trackingGesture = false;
  let gestureStartedInBoundary = false;
  let gestureIdleTimer: ReturnType<typeof setTimeout> | null = null;

  const clearGesture = () => {
    trackingGesture = false;
    gestureStartedInBoundary = false;
    gestureIdleTimer = null;
  };

  const scheduleGestureEnd = () => {
    if (gestureIdleTimer != null) clearTimeout(gestureIdleTimer);
    gestureIdleTimer = setTimeout(clearGesture, idleMs);
  };

  return {
    noteWheel(isInBoundary) {
      if (!trackingGesture) {
        trackingGesture = true;
        gestureStartedInBoundary = isInBoundary;
      }
      scheduleGestureEnd();
    },
    shouldAllowBoundaryScroll() {
      return gestureStartedInBoundary;
    },
    dispose() {
      if (gestureIdleTimer != null) clearTimeout(gestureIdleTimer);
      clearGesture();
    },
  };
}

/** 仅当滚轮手势在边界元素内开始时，才允许其内部滚动（避免编辑区惯性滚入文件树）。 */
export function useWheelScrollOnlyWhenGestureStartsIn(
  boundaryRef: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    const tracker = createWheelGestureTracker();

    const resolveBoundary = () => boundaryRef.current;

    const onDocumentWheelCapture = (event: WheelEvent) => {
      const boundary = resolveBoundary();
      if (!boundary) return;
      tracker.noteWheel(isPointerInElement(event, boundary));
    };

    const onBoundaryWheelCapture = (event: WheelEvent) => {
      if (tracker.shouldAllowBoundaryScroll()) return;
      event.preventDefault();
      event.stopPropagation();
    };

    document.addEventListener('wheel', onDocumentWheelCapture, {
      capture: true,
      passive: true,
    });

    const boundary = resolveBoundary();
    boundary?.addEventListener('wheel', onBoundaryWheelCapture, {
      capture: true,
      passive: false,
    });

    return () => {
      tracker.dispose();
      document.removeEventListener('wheel', onDocumentWheelCapture, true);
      boundary?.removeEventListener('wheel', onBoundaryWheelCapture, true);
    };
  }, [boundaryRef]);
}
