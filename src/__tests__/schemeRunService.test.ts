import fs from 'fs';
import os from 'os';
import path from 'path';
import { runSchemeScript } from '../main/services/schemeRunService';

describe('runSchemeScript', () => {
  it('runs a script with chez when available', () => {
    const chez =
      process.platform === 'win32'
        ? null
        : (() => {
            const candidates = [
              '/opt/homebrew/bin/chez',
              '/usr/local/bin/chez',
              '/usr/bin/chez',
            ];
            return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
          })();

    if (!chez) {
      return;
    }

    const result = runSchemeScript(chez, '(display "muled-scheme-ok")');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('muled-scheme-ok');
  });

  it('returns non-zero exit code for invalid scheme', () => {
    const chez =
      process.platform === 'win32'
        ? null
        : (() => {
            const candidates = [
              '/opt/homebrew/bin/chez',
              '/usr/local/bin/chez',
              '/usr/bin/chez',
            ];
            return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
          })();

    if (!chez) {
      return;
    }

    const result = runSchemeScript(chez, '(undefined-symbol)');
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr.length + result.stdout.length).toBeGreaterThan(0);
  });

  it('returns error output for missing executable', () => {
    const fakeChez = path.join(os.tmpdir(), `muled-missing-chez-${Date.now()}`);
    const result = runSchemeScript(fakeChez, '(display 1)');
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr.length).toBeGreaterThan(0);
  });
});
