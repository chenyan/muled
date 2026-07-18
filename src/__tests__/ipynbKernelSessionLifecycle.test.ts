import {
  disposeIpynbKernelSessionRef,
  shouldDisposeIpynbKernelOnTabContextChange,
} from '../renderer/lib/ipynb/ipynbKernelSessionLifecycle';

describe('ipynbKernelSessionLifecycle', () => {
  it('disposes when notebook key changes', () => {
    expect(
      shouldDisposeIpynbKernelOnTabContextChange(
        { notebookKey: 'a' },
        { notebookKey: 'b' },
      ),
    ).toBe(true);
    expect(
      shouldDisposeIpynbKernelOnTabContextChange(
        { notebookKey: 'a' },
        { notebookKey: 'a' },
      ),
    ).toBe(false);
  });

  it('clears session ref on dispose', () => {
    const sessionIdRef = { current: 'sess-1' as string | null };
    const disposed: string[] = [];
    const id = disposeIpynbKernelSessionRef({
      sessionIdRef,
      dispose: (sessionId) => {
        disposed.push(sessionId);
      },
    });
    expect(id).toBe('sess-1');
    expect(sessionIdRef.current).toBeNull();
    expect(disposed).toEqual(['sess-1']);
  });
});
