export type IpynbKernelTabContext = {
  notebookKey: string | null;
};

export function shouldDisposeIpynbKernelOnTabContextChange(
  previous: IpynbKernelTabContext,
  next: IpynbKernelTabContext,
): boolean {
  return previous.notebookKey !== next.notebookKey;
}

export function disposeIpynbKernelSessionRef(args: {
  sessionIdRef: { current: string | null };
  dispose: (sessionId: string) => void;
}): string | null {
  const sessionId = args.sessionIdRef.current;
  args.sessionIdRef.current = null;
  if (sessionId) {
    args.dispose(sessionId);
  }
  return sessionId;
}
