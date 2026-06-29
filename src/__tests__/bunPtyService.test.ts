import type { WebContents } from 'electron';
import {
  bunLoadCommand,
  bunPtySpawnArgv,
  createBunPtySession,
  isBunReplPromptReady,
  killAllBunPtySessions,
  killBunPtySession,
  resizeBunPtySession,
  stripPtyAnsi,
  writeBunPtySession,
} from '../main/services/bunPtyService';

const mockProc = {
  write: jest.fn(),
  resize: jest.fn(),
  kill: jest.fn(),
  onData: jest.fn(),
  onExit: jest.fn(),
};

let onDataHandler: ((data: string) => void) | null = null;

jest.mock('node-pty', () => ({
  spawn: jest.fn(() => {
    mockProc.onData.mockImplementation((handler: (data: string) => void) => {
      onDataHandler = handler;
    });
    return mockProc;
  }),
}));

jest.mock('../main/shellPath', () => ({
  getShellProcessEnv: () => ({}),
}));

function createMockWebContents(): WebContents & { __destroy: () => void } {
  let destroyed = false;
  const onceHandlers = new Map<string, Array<() => void>>();

  return {
    id: Math.floor(Math.random() * 100000),
    isDestroyed: () => destroyed,
    send: jest.fn(),
    once: (event: string, handler: () => void) => {
      const handlers = onceHandlers.get(event) ?? [];
      handlers.push(handler);
      onceHandlers.set(event, handlers);
    },
    __destroy: () => {
      destroyed = true;
      for (const handler of onceHandlers.get('destroyed') ?? []) {
        handler();
      }
    },
  } as unknown as WebContents & { __destroy: () => void };
}

describe('bunLoadCommand', () => {
  it('builds a repl import for the basename', () => {
    expect(bunLoadCommand('/tmp/foo/bar.ts')).toBe(
      "void Object.assign(globalThis, await import('./bar.ts'))\r",
    );
  });
});

describe('bunPtySpawnArgv', () => {
  it('always starts bun repl', () => {
    expect(bunPtySpawnArgv()).toEqual(['repl']);
  });
});

describe('isBunReplPromptReady', () => {
  it('detects the repl prompt after ANSI cursor sequences', () => {
    const chunk =
      "Welcome to Bun\r\n> \u001b[3G";
    expect(isBunReplPromptReady(chunk)).toBe(true);
    expect(stripPtyAnsi(chunk).endsWith('> ')).toBe(true);
  });

  it('ignores output before the prompt is shown', () => {
    expect(isBunReplPromptReady('Welcome to Bun\r\n')).toBe(false);
  });
});

describe('bun pty session lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    onDataHandler = null;
    killAllBunPtySessions();
  });

  it('spawns bun repl and loads the file after the prompt appears', () => {
    const pty = require('node-pty');
    const wc = createMockWebContents();
    const created = createBunPtySession(
      '/usr/bin/bun',
      { code: 'console.log(1)', cols: 80, rows: 24 },
      () => '/tmp/unused.ts',
      wc,
    );
    expect(created).toEqual({ ok: true, sessionId: expect.any(String) });
    expect(pty.spawn).toHaveBeenCalledWith(
      '/usr/bin/bun',
      ['repl'],
      expect.objectContaining({ cwd: expect.any(String) }),
    );
    if (!('ok' in created) || !created.ok) return;

    resizeBunPtySession(created.sessionId, 100, 30);
    expect(mockProc.write).not.toHaveBeenCalledWith(
      expect.stringMatching(/^await import/),
    );

    onDataHandler?.(
      "Welcome to Bun\r\n\u001b[1G\u001b[0J> \u001b[3G",
    );
    expect(mockProc.write).toHaveBeenCalledWith(
      "void Object.assign(globalThis, await import('./session.js'))\r",
    );
  });

  it('kills sessions on webContents destroyed', () => {
    const wc = createMockWebContents();
    const created = createBunPtySession(
      '/usr/bin/bun',
      { cols: 80, rows: 24 },
      () => '/tmp/unused.ts',
      wc,
    );
    if (!('ok' in created) || !created.ok) return;

    wc.__destroy();
    expect(mockProc.kill).toHaveBeenCalled();
    expect(killBunPtySession(created.sessionId)).toBe(false);
  });
});
