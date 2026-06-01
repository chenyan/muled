import fs from 'fs';
import os from 'os';
import path from 'path';
import { toWorkspaceRelativePath } from '../shared/pathUtils';

describe('toWorkspaceRelativePath with symlinked workspace', () => {
  it('maps canonical absolute paths under a symlink root', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'muled-symlink-'));
    const realDir = path.join(tmp, 'real');
    const linkDir = path.join(tmp, 'link');
    fs.mkdirSync(realDir);
    fs.mkdirSync(path.join(realDir, 'nested'));
    fs.writeFileSync(path.join(realDir, 'nested', 'note.md'), 'x');
    fs.symlinkSync(realDir, linkDir);

    const canonicalFile = fs.realpathSync(path.join(realDir, 'nested', 'note.md'));
    expect(toWorkspaceRelativePath(linkDir, canonicalFile)).toBe('nested/note.md');
    expect(toWorkspaceRelativePath(linkDir, './nested/note.md')).toBe(
      'nested/note.md',
    );
  });
});
