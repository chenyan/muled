import fs from 'fs';
import os from 'os';
import type { WebContents } from 'electron';
import {
  createSchemePtySession,
  killAllSchemePtySessions,
  killSchemePtySession,
  schemeLoadCommand,
  writeSchemePtySession,
} from '../main/services/schemePtyService';

const CHEZ_GREETING_RE =
  /^Chez Scheme Version[^\r\n]*\r?\nCopyright[^\r\n]*\r?\n(?:\r?\n)?/;

const mockProc = {
  write: jest.fn(),
  resize: jest.fn(),
  kill: jest.fn(),
  onData: jest.fn(),
  onExit: jest.fn(),
};

jest.mock('node-pty', () => ({
  spawn: jest.fn(() => mockProc),
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

describe('schemeLoadCommand', () => {
  it('builds a Chez load form with normalized path', () => {
    expect(schemeLoadCommand('/tmp/foo/bar.scm')).toBe(
      '(load "/tmp/foo/bar.scm")\r',
    );
  });

  it('escapes double quotes in paths', () => {
    expect(schemeLoadCommand('/tmp/foo \"x\".scm')).toBe(
      '(load "/tmp/foo \\"x\\".scm")\r',
    );
  });
});

describe('Chez greeting strip', () => {
  it('removes version/copyright banner but keeps prompt', () => {
    const input =
      'Chez Scheme Version 10.0.0\r\nCopyright 1984-2024 Cisco Systems, Inc.\r\n\r\n\r> ';
    expect(input.replace(CHEZ_GREETING_RE, '')).toBe('\r> ');
  });
});

describe('scheme pty session lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    killAllSchemePtySessions();
  });

  it('creates, writes, and kills a session', () => {
    const webContents = createMockWebContents();
    const created = createSchemePtySession(
      '/usr/bin/chez',
      { code: '(display 1)', cols: 80, rows: 24 },
      (relative) => `/workspace/${relative}`,
      webContents,
    );

    expect(created).toEqual({ ok: true, sessionId: expect.any(String) });
    if (!('ok' in created) || !created.ok) return;

    expect(writeSchemePtySession(created.sessionId, '(+ 1 2)')).toBe(true);
    expect(mockProc.write).toHaveBeenCalledWith('(+ 1 2)');

    expect(killSchemePtySession(created.sessionId)).toBe(true);
    expect(mockProc.kill).toHaveBeenCalled();
    expect(writeSchemePtySession(created.sessionId, 'ignored')).toBe(false);
  });

  it('cleans up temp directories for code sessions', () => {
    const webContents = createMockWebContents();
    const created = createSchemePtySession(
      '/usr/bin/chez',
      { code: '(display "tmp")', cols: 80, rows: 24 },
      (relative) => `/workspace/${relative}`,
      webContents,
    );
    if (!('ok' in created) || !created.ok) return;

    const tmpDirsBeforeKill = fs
      .readdirSync(os.tmpdir())
      .filter((name) => name.startsWith('muled-scheme-pty-'));
    expect(tmpDirsBeforeKill.length).toBeGreaterThan(0);

    expect(killSchemePtySession(created.sessionId)).toBe(true);

    const tmpDirsAfterKill = fs
      .readdirSync(os.tmpdir())
      .filter((name) => name.startsWith('muled-scheme-pty-'));
    expect(tmpDirsAfterKill).toEqual([]);
  });

  it('kills sessions when the renderer webContents is destroyed', () => {
    const webContents = createMockWebContents();
    const created = createSchemePtySession(
      '/usr/bin/chez',
      { code: '(display 1)', cols: 80, rows: 24 },
      (relative) => `/workspace/${relative}`,
      webContents,
    );
    if (!('ok' in created) || !created.ok) return;

    webContents.__destroy();

    expect(mockProc.kill).toHaveBeenCalled();
    expect(writeSchemePtySession(created.sessionId, 'ignored')).toBe(false);
  });

  it('killAllSchemePtySessions clears every active session', () => {
    const first = createMockWebContents();
    const second = createMockWebContents();
    const createdA = createSchemePtySession(
      '/usr/bin/chez',
      { code: '(display 1)', cols: 80, rows: 24 },
      (relative) => `/workspace/${relative}`,
      first,
    );
    const createdB = createSchemePtySession(
      '/usr/bin/chez',
      { code: '(display 2)', cols: 80, rows: 24 },
      (relative) => `/workspace/${relative}`,
      second,
    );
    if (
      !('ok' in createdA) ||
      !createdA.ok ||
      !('ok' in createdB) ||
      !createdB.ok
    ) {
      return;
    }

    killAllSchemePtySessions();

    expect(mockProc.kill).toHaveBeenCalledTimes(2);
    expect(writeSchemePtySession(createdA.sessionId, 'ignored')).toBe(false);
    expect(writeSchemePtySession(createdB.sessionId, 'ignored')).toBe(false);
  });
});
