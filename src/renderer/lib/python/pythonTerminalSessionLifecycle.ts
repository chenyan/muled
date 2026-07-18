import { getSourceLanguageId } from '../fileLanguage';

export type PythonTerminalTabContext = {
  relativePath: string | null;
  isPythonSourceTab: boolean;
};

export function isPythonSourceTab(
  kind: string | undefined | null,
  relativePath: string | null | undefined,
): boolean {
  return kind === 'text' && getSourceLanguageId(relativePath ?? null) === 'python';
}

export function shouldDisposePythonTerminalOnTabContextChange(
  previous: PythonTerminalTabContext,
  next: PythonTerminalTabContext,
): boolean {
  if (previous.relativePath !== next.relativePath) return true;
  if (previous.isPythonSourceTab && !next.isPythonSourceTab) return true;
  return false;
}

export function disposePythonTerminalSession(args: {
  sessionIdRef: { current: string | null };
  sessionId?: string | null;
  kill: (sessionId: string) => void | Promise<void>;
}): string | null {
  const sessionId = args.sessionId ?? args.sessionIdRef.current;
  args.sessionIdRef.current = null;
  if (sessionId) {
    void args.kill(sessionId);
  }
  return sessionId;
}
