import {
  buildMovesForDrop,
  isFileTreeRowContextMenuTarget,
  joinRelativePath,
  remapTreePathsForMove,
  resolveDropDestinationPath,
  resolveTargetDirectoryFromSelection,
  uniqueSiblingBasename,
} from '../renderer/lib/workspaceTreeFileOps';

describe('isFileTreeRowContextMenuTarget', () => {
  it('returns true when the event path includes a tree row', () => {
    const row = document.createElement('div');
    row.dataset.type = 'item';
    const event = new MouseEvent('contextmenu', { bubbles: true });
    Object.defineProperty(event, 'composedPath', {
      value: () => [row],
    });
    expect(isFileTreeRowContextMenuTarget(event)).toBe(true);
  });

  it('returns false for blank tree area', () => {
    const host = document.createElement('div');
    const event = new MouseEvent('contextmenu', { bubbles: true });
    Object.defineProperty(event, 'composedPath', {
      value: () => [host],
    });
    expect(isFileTreeRowContextMenuTarget(event)).toBe(false);
  });
});

describe('resolveTargetDirectoryFromSelection', () => {
  it('returns the last selected directory', () => {
    expect(
      resolveTargetDirectoryFromSelection(['README.md', 'src/', 'docs/']),
    ).toBe('docs/');
  });

  it('returns root when no directory is selected', () => {
    expect(resolveTargetDirectoryFromSelection(['README.md'])).toBe('');
    expect(resolveTargetDirectoryFromSelection([])).toBe('');
  });
});

describe('uniqueSiblingBasename', () => {
  it('avoids sibling collisions', () => {
    expect(uniqueSiblingBasename(['未命名', 'README.md'], '未命名')).toBe(
      '未命名 2',
    );
    expect(
      uniqueSiblingBasename(['未命名', '未命名 2'], '未命名'),
    ).toBe('未命名 3');
  });
});

describe('joinRelativePath', () => {
  it('joins under a directory with trailing slash', () => {
    expect(joinRelativePath('src/', 'index.ts', false)).toBe('src/index.ts');
    expect(joinRelativePath('', 'notes.md', false)).toBe('notes.md');
    expect(joinRelativePath('src/', 'utils', true)).toBe('src/utils/');
  });
});

describe('remapTreePathsForMove', () => {
  it('remaps nested paths when a folder is renamed', () => {
    expect(
      remapTreePathsForMove(
        ['src/', 'src/index.ts', 'README.md'],
        'src/',
        'lib/',
      ),
    ).toEqual(['lib/index.ts', 'lib/', 'README.md']);
  });
});

describe('resolveDropDestinationPath', () => {
  it('moves a file into a directory', () => {
    expect(
      resolveDropDestinationPath('notes.md', {
        kind: 'directory',
        directoryPath: 'docs/',
      }),
    ).toBe('docs/notes.md');
  });

  it('moves a file to workspace root', () => {
    expect(
      resolveDropDestinationPath('src/index.ts', {
        kind: 'root',
        directoryPath: null,
      }),
    ).toBe('index.ts');
  });

  it('moves a folder into another folder', () => {
    expect(
      resolveDropDestinationPath('src/utils/', {
        kind: 'directory',
        directoryPath: 'lib/',
      }),
    ).toBe('lib/utils/');
  });
});

describe('buildMovesForDrop', () => {
  it('skips no-op moves within the same location', () => {
    expect(
      buildMovesForDrop(['README.md'], {
        kind: 'root',
        directoryPath: null,
      }),
    ).toEqual([]);
  });

  it('builds multiple moves for a multi-select drop', () => {
    expect(
      buildMovesForDrop(['a.md', 'b.md'], {
        kind: 'directory',
        directoryPath: 'docs/',
      }),
    ).toEqual([
      { from: 'a.md', to: 'docs/a.md' },
      { from: 'b.md', to: 'docs/b.md' },
    ]);
  });
});
