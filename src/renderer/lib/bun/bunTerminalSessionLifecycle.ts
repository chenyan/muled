import { getSourceLanguageId, isBunRunnableSourceLanguage } from '../fileLanguage';

export type BunTerminalTabContext = {
  relativePath: string | null;
  isBunSourceTab: boolean;
};

export function isBunSourceTab(
  kind: string | undefined | null,
  relativePath: string | null | undefined,
): boolean {
  return (
    kind === 'text' &&
    isBunRunnableSourceLanguage(getSourceLanguageId(relativePath ?? null))
  );
}

export function shouldDisposeBunTerminalOnTabContextChange(
  previous: BunTerminalTabContext,
  next: BunTerminalTabContext,
): boolean {
  if (previous.relativePath !== next.relativePath) return true;
  if (previous.isBunSourceTab && !next.isBunSourceTab) return true;
  return false;
}

export function disposeBunTerminalSession(args: {
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
