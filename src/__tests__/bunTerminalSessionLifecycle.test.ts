import {
  disposeBunTerminalSession,
  isBunSourceTab,
  shouldDisposeBunTerminalOnTabContextChange,
} from '../renderer/lib/bun/bunTerminalSessionLifecycle';

describe('isBunSourceTab', () => {
  it('matches javascript and typescript source files', () => {
    expect(isBunSourceTab('text', 'src/app.ts')).toBe(true);
    expect(isBunSourceTab('text', 'src/app.js')).toBe(true);
    expect(isBunSourceTab('text', 'src/App.tsx')).toBe(true);
    expect(isBunSourceTab('text', 'notes.md')).toBe(false);
    expect(isBunSourceTab('text', 'main.scm')).toBe(false);
  });
});

describe('shouldDisposeBunTerminalOnTabContextChange', () => {
  it('disposes when path changes', () => {
    expect(
      shouldDisposeBunTerminalOnTabContextChange(
        { relativePath: 'a.ts', isBunSourceTab: true },
        { relativePath: 'b.ts', isBunSourceTab: true },
      ),
    ).toBe(true);
  });

  it('disposes when leaving bun source tab', () => {
    expect(
      shouldDisposeBunTerminalOnTabContextChange(
        { relativePath: 'a.ts', isBunSourceTab: true },
        { relativePath: 'a.ts', isBunSourceTab: false },
      ),
    ).toBe(true);
  });
});

describe('disposeBunTerminalSession', () => {
  it('kills the active session and clears the ref', () => {
    const sessionIdRef = { current: 'session-1' as string | null };
    const kill = jest.fn();
    disposeBunTerminalSession({
      sessionIdRef,
      kill,
    });
    expect(kill).toHaveBeenCalledWith('session-1');
    expect(sessionIdRef.current).toBeNull();
  });
});
