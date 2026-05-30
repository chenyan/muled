import {
  ancestorDirectoryPaths,
  buildPathBreadcrumbs,
  directoryPath,
} from '../renderer/lib/workspaceTreeReveal';

describe('buildPathBreadcrumbs', () => {
  it('splits file path with directory trailing slashes on segments', () => {
    expect(buildPathBreadcrumbs('cs/llm/Attention? Attention!.md')).toEqual([
      { label: 'cs', treePath: 'cs/' },
      { label: 'llm', treePath: 'cs/llm/' },
      { label: 'Attention? Attention!.md', treePath: 'cs/llm/Attention? Attention!.md' },
    ]);
  });

  it('marks directory-only path', () => {
    expect(buildPathBreadcrumbs('src/utils/')).toEqual([
      { label: 'src', treePath: 'src/' },
      { label: 'utils', treePath: 'src/utils/' },
    ]);
  });
});

describe('ancestorDirectoryPaths', () => {
  it('includes parent dirs for a file', () => {
    expect(ancestorDirectoryPaths('cs/llm/foo.md')).toEqual(['cs/', 'cs/llm/']);
  });

  it('includes target directory', () => {
    expect(ancestorDirectoryPaths('cs/llm/')).toEqual(['cs/', 'cs/llm/']);
  });
});

describe('directoryPath', () => {
  it('joins with trailing slash', () => {
    expect(directoryPath(['a', 'b'])).toBe('a/b/');
  });
});
