import path from 'path';
import {
  parseToolPaths,
  shellToolPathNames,
} from '../shared/types/tools';
import { resolveToolExecutable } from '../main/services/toolPathService';

describe('parseToolPaths', () => {
  it('parses fd and rg paths', () => {
    expect(
      parseToolPaths({ fd: ' /opt/homebrew/bin/fd ', rg: '~/bin/rg' }),
    ).toEqual({
      fd: '/opt/homebrew/bin/fd',
      rg: '~/bin/rg',
    });
  });

  it('defaults missing fields to empty strings', () => {
    expect(parseToolPaths(null)).toEqual({ fd: '', rg: '' });
  });
});

describe('shellToolPathNames', () => {
  it('includes fdfind on linux', () => {
    expect(shellToolPathNames('fd', 'linux')).toEqual(['fdfind', 'fd']);
  });
});

describe('resolveToolExecutable', () => {
  it('resolves an explicit executable path', () => {
    const bin =
      process.platform === 'win32'
        ? (process.env.ComSpec ?? 'C:\\Windows\\System32\\cmd.exe')
        : '/bin/ls';
    expect(resolveToolExecutable('rg', bin)).toBe(path.normalize(bin));
  });

  it('returns null for a configured but missing file', () => {
    expect(resolveToolExecutable('fd', '/nonexistent/muled-fd-test')).toBeNull();
  });
});
