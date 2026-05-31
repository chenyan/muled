import {
  createWheelGestureTracker,
  WHEEL_GESTURE_IDLE_MS,
} from '../renderer/lib/wheelScrollOnlyWhenGestureStartsIn';

describe('createWheelGestureTracker', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('allows scroll when the gesture starts inside the boundary', () => {
    const tracker = createWheelGestureTracker();
    tracker.noteWheel(true);
    expect(tracker.shouldAllowBoundaryScroll()).toBe(true);
    tracker.dispose();
  });

  it('blocks scroll when the gesture starts outside the boundary', () => {
    const tracker = createWheelGestureTracker();
    tracker.noteWheel(false);
    expect(tracker.shouldAllowBoundaryScroll()).toBe(false);
    tracker.dispose();
  });

  it('keeps the origin for momentum events after pointer moves into the boundary', () => {
    const tracker = createWheelGestureTracker();
    tracker.noteWheel(false);
    tracker.noteWheel(true);
    expect(tracker.shouldAllowBoundaryScroll()).toBe(false);
    tracker.dispose();
  });

  it('resets after the gesture goes idle', () => {
    const tracker = createWheelGestureTracker();
    tracker.noteWheel(false);
    jest.advanceTimersByTime(WHEEL_GESTURE_IDLE_MS + 1);
    tracker.noteWheel(true);
    expect(tracker.shouldAllowBoundaryScroll()).toBe(true);
    tracker.dispose();
  });
});
