import {
  shouldIgnoreWorkspaceWatchPath,
} from '../main/services/workspaceWatcherService';
import { diffDirectoryChildren } from '../renderer/lib/workspaceTreeFileOps';

describe('shouldIgnoreWorkspaceWatchPath', () => {
  it('ignores dotfiles and ignored directories', () => {
    expect(shouldIgnoreWorkspaceWatchPath('.git/config')).toBe(true);
    expect(shouldIgnoreWorkspaceWatchPath('node_modules/pkg/index.js')).toBe(
      true,
    );
    expect(shouldIgnoreWorkspaceWatchPath('src/app.ts')).toBe(false);
  });
});

describe('diffDirectoryChildren', () => {
  it('detects added and removed direct children', () => {
    expect(
      diffDirectoryChildren(
        ['a.md', 'docs/'],
        ['b.md', 'docs/'],
      ),
    ).toEqual({
      added: ['b.md'],
      removed: ['a.md'],
    });
  });
});
