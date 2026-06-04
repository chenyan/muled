import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  compressTilde,
  expandTilde,
  getTranslationHistoryConfigPath,
  getTranslationHistoryFilePath,
  isPathInsideRoot,
  resolvePath,
} from '../shared/pathUtils';

describe('pathUtils', () => {
  it('expandTilde resolves home-relative paths', () => {
    expect(expandTilde('~/foo')).toBe(path.join(os.homedir(), 'foo'));
  });

  it('isPathInsideRoot rejects path traversal', () => {
    const root = path.join(os.tmpdir(), 'muled-root');
    const inside = path.join(root, 'a.md');
    const outside = path.join(root, '..', 'outside.md');
    expect(isPathInsideRoot(root, inside)).toBe(true);
    expect(isPathInsideRoot(root, outside)).toBe(false);
  });

  it('resolvePath resolves relative to cwd', () => {
    const cwd = path.join(os.tmpdir(), 'muled-cwd');
    fs.mkdirSync(cwd, { recursive: true });
    expect(resolvePath('child.txt', cwd)).toBe(
      path.normalize(path.join(cwd, 'child.txt')),
    );
  });

  it('exposes translation history paths under config dir', () => {
    const filePath = getTranslationHistoryFilePath();
    expect(filePath.endsWith(`${path.sep}translation-history.md`)).toBe(true);
    expect(getTranslationHistoryConfigPath()).toBe(
      compressTilde(filePath),
    );
  });
});
