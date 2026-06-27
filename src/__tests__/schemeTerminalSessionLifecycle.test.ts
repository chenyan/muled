import {
  disposeSchemeTerminalSession,
  isSchemeSourceTab,
  shouldDisposeSchemeTerminalOnTabContextChange,
} from '../renderer/lib/scheme/schemeTerminalSessionLifecycle';

describe('isSchemeSourceTab', () => {
  it('matches text tabs with scheme extension', () => {
    expect(isSchemeSourceTab('text', 'lib/main.scm')).toBe(true);
    expect(isSchemeSourceTab('text', 'lib/main.ss')).toBe(true);
  });

  it('rejects non-scheme files and kinds', () => {
    expect(isSchemeSourceTab('text', 'lib/main.py')).toBe(false);
    expect(isSchemeSourceTab('markdown', 'notes.scm')).toBe(false);
    expect(isSchemeSourceTab('text', null)).toBe(false);
  });
});

describe('shouldDisposeSchemeTerminalOnTabContextChange', () => {
  const schemeContext = {
    relativePath: 'a.scm',
    isSchemeSourceTab: true,
  };

  it('disposes when relative path changes within the same tab', () => {
    expect(
      shouldDisposeSchemeTerminalOnTabContextChange(schemeContext, {
        relativePath: 'b.scm',
        isSchemeSourceTab: true,
      }),
    ).toBe(true);
  });

  it('disposes when leaving scheme source mode', () => {
    expect(
      shouldDisposeSchemeTerminalOnTabContextChange(schemeContext, {
        relativePath: 'a.scm',
        isSchemeSourceTab: false,
      }),
    ).toBe(true);
  });

  it('keeps session when context is unchanged', () => {
    expect(
      shouldDisposeSchemeTerminalOnTabContextChange(schemeContext, schemeContext),
    ).toBe(false);
  });

  it('disposes when switching into a different scheme file', () => {
    expect(
      shouldDisposeSchemeTerminalOnTabContextChange(
        { relativePath: 'main.py', isSchemeSourceTab: false },
        { relativePath: 'main.scm', isSchemeSourceTab: true },
      ),
    ).toBe(true);
  });
});

describe('disposeSchemeTerminalSession', () => {
  it('kills the active session and clears the ref', () => {
    const sessionIdRef = { current: 'session-1' as string | null };
    const kill = jest.fn();

    expect(
      disposeSchemeTerminalSession({
        sessionIdRef,
        kill,
      }),
    ).toBe('session-1');
    expect(sessionIdRef.current).toBeNull();
    expect(kill).toHaveBeenCalledWith('session-1');
  });

  it('no-ops when there is no active session', () => {
    const sessionIdRef = { current: null as string | null };
    const kill = jest.fn();

    expect(
      disposeSchemeTerminalSession({
        sessionIdRef,
        kill,
      }),
    ).toBeNull();
    expect(kill).not.toHaveBeenCalled();
  });
});
