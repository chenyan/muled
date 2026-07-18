import {
  isPythonSourceTab,
  shouldDisposePythonTerminalOnTabContextChange,
} from '../renderer/lib/python/pythonTerminalSessionLifecycle';

describe('isPythonSourceTab', () => {
  it('matches python text tabs', () => {
    expect(isPythonSourceTab('text', 'scripts/demo.py')).toBe(true);
  });

  it('rejects non-python files', () => {
    expect(isPythonSourceTab('text', 'demo.ts')).toBe(false);
  });
});

describe('shouldDisposePythonTerminalOnTabContextChange', () => {
  it('disposes when file path changes', () => {
    expect(
      shouldDisposePythonTerminalOnTabContextChange(
        { relativePath: 'a.py', isPythonSourceTab: true },
        { relativePath: 'b.py', isPythonSourceTab: true },
      ),
    ).toBe(true);
  });

  it('disposes when leaving python tab', () => {
    expect(
      shouldDisposePythonTerminalOnTabContextChange(
        { relativePath: 'a.py', isPythonSourceTab: true },
        { relativePath: 'a.py', isPythonSourceTab: false },
      ),
    ).toBe(true);
  });
});
