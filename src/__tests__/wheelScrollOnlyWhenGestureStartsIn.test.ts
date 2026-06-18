import {
  createWheelGestureTracker,
  isWheelEventInElement,
  WHEEL_GESTURE_IDLE_MS,
} from '../renderer/lib/wheelScrollOnlyWhenGestureStartsIn';

describe('createWheelGestureTracker', () => {
  const boundaryA = Symbol('a');
  const boundaryB = Symbol('b');

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('allows scroll when the gesture starts inside the boundary', () => {
    const tracker = createWheelGestureTracker();
    tracker.noteWheel(boundaryA);
    expect(tracker.shouldAllowBoundaryScroll(boundaryA)).toBe(true);
    tracker.dispose();
  });

  it('blocks scroll when the gesture starts outside the boundary', () => {
    const tracker = createWheelGestureTracker();
    tracker.noteWheel(null);
    expect(tracker.shouldAllowBoundaryScroll(boundaryA)).toBe(false);
    tracker.dispose();
  });

  it('keeps the origin for momentum events after pointer moves into the boundary', () => {
    const tracker = createWheelGestureTracker();
    tracker.noteWheel(null);
    tracker.noteWheel(boundaryA);
    expect(tracker.shouldAllowBoundaryScroll(boundaryA)).toBe(false);
    tracker.dispose();
  });

  it('ends the gesture when pointer leaves the origin boundary', () => {
    const tracker = createWheelGestureTracker();
    tracker.noteWheel(boundaryA);
    tracker.noteWheel(boundaryB);
    expect(tracker.shouldAllowBoundaryScroll(boundaryB)).toBe(false);
    expect(tracker.shouldAllowBoundaryScroll(boundaryA)).toBe(false);
    tracker.dispose();
  });

  it('resets after the gesture goes idle', () => {
    const tracker = createWheelGestureTracker();
    tracker.noteWheel(null);
    jest.advanceTimersByTime(WHEEL_GESTURE_IDLE_MS + 1);
    tracker.noteWheel(boundaryA);
    expect(tracker.shouldAllowBoundaryScroll(boundaryA)).toBe(true);
    tracker.dispose();
  });
});

describe('isWheelEventInElement', () => {
  it('detects wheel events that pass through shadow DOM hosts', () => {
    const boundary = document.createElement('div');
    const host = document.createElement('div');
    const inner = document.createElement('div');
    boundary.append(host);
    host.append(inner);
    document.body.append(boundary);

    const event = new WheelEvent('wheel', { bubbles: true, composed: true });
    Object.defineProperty(event, 'composedPath', {
      value: () => [inner, host, boundary, document],
    });

    expect(isWheelEventInElement(event, boundary)).toBe(true);
    expect(isWheelEventInElement(event, document.createElement('div'))).toBe(
      false,
    );

    boundary.remove();
  });
});
