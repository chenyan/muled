import fs from 'fs';
import os from 'os';
import path from 'path';
import { bunLoadCommand } from '../main/services/bunPtyService';
import { bunScriptExtension, runBunScript } from '../main/services/bunRunService';

describe('bunScriptExtension', () => {
  it('uses ts for typescript languages', () => {
    expect(bunScriptExtension('typescript')).toBe('ts');
    expect(bunScriptExtension('tsx')).toBe('ts');
  });

  it('uses js for javascript languages', () => {
    expect(bunScriptExtension('javascript')).toBe('js');
    expect(bunScriptExtension('jsx')).toBe('js');
  });
});

describe('bunLoadCommand', () => {
  it('builds a repl import for the basename', () => {
    expect(bunLoadCommand('/tmp/foo/bar.ts')).toBe(
      "void Object.assign(globalThis, await import('./bar.ts'))\r",
    );
  });
});

describe('runBunScript', () => {
  it('runs a script with bun when available', async () => {
    const bun =
      process.platform === 'win32'
        ? null
        : ['/opt/homebrew/bin/bun', '/usr/local/bin/bun', `${os.homedir()}/.bun/bin/bun`]
            .map((candidate) => (fs.existsSync(candidate) ? candidate : null))
            .find(Boolean) ?? null;
    if (!bun) {
      return;
    }

    const result = await runBunScript(bun, 'console.log("muled-bun-ok")');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('muled-bun-ok');
  });

  it('reports errors for invalid code', async () => {
    const bun =
      process.platform === 'win32'
        ? null
        : ['/opt/homebrew/bin/bun', '/usr/local/bin/bun', `${os.homedir()}/.bun/bin/bun`]
            .map((candidate) => (fs.existsSync(candidate) ? candidate : null))
            .find(Boolean) ?? null;
    if (!bun) {
      return;
    }

    const result = await runBunScript(bun, 'throw new Error("muled-bun-fail")');
    expect(result.exitCode).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toMatch(/muled-bun-fail|Error/i);
  });

  it('returns spawn error for missing executable', async () => {
    const fakeBun = path.join(os.tmpdir(), `muled-missing-bun-${Date.now()}`);
    const result = await runBunScript(fakeBun, 'console.log(1)');
    expect(result.exitCode).toBe(1);
    expect(result.stderr.length).toBeGreaterThan(0);
  });
});
