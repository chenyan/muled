import { useLayoutEffect, type RefObject } from 'react';

/** 触控板惯性滚动事件间隔可能略长，过短会把手势误判为结束。 */
export const WHEEL_GESTURE_IDLE_MS = 400;

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

export function isWheelEventInElement(
  event: WheelEvent,
  element: HTMLElement,
): boolean {
  return event.composedPath().includes(element);
}

type GestureOrigin = symbol | 'outside';

export type WheelGestureTracker = {
  noteWheel(boundaryAtPointer: symbol | null): void;
  shouldAllowBoundaryScroll(boundaryId: symbol): boolean;
  dispose(): void;
};

export function createWheelGestureTracker(
  idleMs = WHEEL_GESTURE_IDLE_MS,
): WheelGestureTracker {
  let trackingGesture = false;
  let gestureOrigin: GestureOrigin | null = null;
  let gestureInvalidated = false;
  let gestureIdleTimer: ReturnType<typeof setTimeout> | null = null;

  const clearGesture = () => {
    trackingGesture = false;
    gestureOrigin = null;
    gestureInvalidated = false;
    gestureIdleTimer = null;
  };

  const scheduleGestureEnd = () => {
    if (gestureIdleTimer != null) clearTimeout(gestureIdleTimer);
    gestureIdleTimer = setTimeout(clearGesture, idleMs);
  };

  return {
    noteWheel(boundaryAtPointer) {
      const current: GestureOrigin = boundaryAtPointer ?? 'outside';

      if (!trackingGesture) {
        trackingGesture = true;
        gestureInvalidated = false;
        gestureOrigin = current;
      } else if (!gestureInvalidated && current !== gestureOrigin) {
        gestureInvalidated = true;
      }

      scheduleGestureEnd();
    },
    shouldAllowBoundaryScroll(boundaryId) {
      if (!trackingGesture) return true;
      if (gestureInvalidated) return false;
      if (gestureOrigin === 'outside') return false;
      return gestureOrigin === boundaryId;
    },
    dispose() {
      if (gestureIdleTimer != null) clearTimeout(gestureIdleTimer);
      clearGesture();
    },
  };
}

const boundaryRegistry = new Map<symbol, HTMLElement>();
let listenerCount = 0;
const gestureTracker = createWheelGestureTracker();

function findBoundaryAtPointer(
  clientX: number,
  clientY: number,
): symbol | null {
  for (const [id, boundary] of boundaryRegistry) {
    if (isPointerInElement({ clientX, clientY }, boundary)) {
      return id;
    }
  }
  return null;
}

export function noteWheelScrollAtPointer(
  clientX: number,
  clientY: number,
): void {
  gestureTracker.noteWheel(findBoundaryAtPointer(clientX, clientY));
}

function onDocumentWheelCapture(event: WheelEvent) {
  noteWheelScrollAtPointer(event.clientX, event.clientY);

  for (const [id, boundary] of boundaryRegistry) {
    if (
      isWheelEventInElement(event, boundary) &&
      !gestureTracker.shouldAllowBoundaryScroll(id)
    ) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
  }
}

function ensureDocumentWheelListener() {
  if (listenerCount === 1) {
    document.addEventListener('wheel', onDocumentWheelCapture, {
      capture: true,
      passive: false,
    });
  }
}

function releaseDocumentWheelListener() {
  if (listenerCount === 0) {
    document.removeEventListener('wheel', onDocumentWheelCapture, true);
    gestureTracker.dispose();
  }
}

export function registerWheelScrollBoundary(element: HTMLElement): () => void {
  const id = Symbol('wheel-scroll-boundary');
  boundaryRegistry.set(id, element);
  listenerCount += 1;
  ensureDocumentWheelListener();

  return () => {
    boundaryRegistry.delete(id);
    listenerCount -= 1;
    releaseDocumentWheelListener();
  };
}

/** 将 iframe 内滚轮同步到全局手势追踪（父文档收不到 iframe 内的 wheel 事件）。 */
export function noteIframeWheelScroll(
  hostElement: HTMLElement,
  iframeClientX: number,
  iframeClientY: number,
): void {
  const rect = hostElement.getBoundingClientRect();
  noteWheelScrollAtPointer(
    rect.left + iframeClientX,
    rect.top + iframeClientY,
  );
}

/** 仅当滚轮手势在边界元素内开始时，才允许其内部滚动（避免惯性滚入其他面板）。 */
export function useWheelScrollOnlyWhenGestureStartsIn(
  boundaryRef: RefObject<HTMLElement | null>,
): void {
  useLayoutEffect(() => {
    const boundary = boundaryRef.current;
    if (!boundary) return undefined;
    return registerWheelScrollBoundary(boundary);
  }, [boundaryRef]);
}
