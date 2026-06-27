import { getSourceLanguageId } from '../fileLanguage';

export type SchemeTerminalTabContext = {
  relativePath: string | null;
  isSchemeSourceTab: boolean;
};

export function isSchemeSourceTab(
  kind: string | undefined | null,
  relativePath: string | null | undefined,
): boolean {
  return kind === 'text' && getSourceLanguageId(relativePath ?? null) === 'scheme';
}

/** Same tab id: dispose an active REPL when the edited file context no longer matches. */
export function shouldDisposeSchemeTerminalOnTabContextChange(
  previous: SchemeTerminalTabContext,
  next: SchemeTerminalTabContext,
): boolean {
  if (previous.relativePath !== next.relativePath) return true;
  if (previous.isSchemeSourceTab && !next.isSchemeSourceTab) return true;
  return false;
}

export function disposeSchemeTerminalSession(args: {
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
