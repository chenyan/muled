import { listDirectoryChildren } from '../renderer/lib/listDirectoryChildren';

describe('listDirectoryChildren', () => {
  const paths = [
    'README.md',
    'docs/',
    'docs/guide.md',
    'docs/images/',
    'docs/images/a.png',
    'docs/images/b.jpg',
    'src/app.ts',
  ];

  it('lists immediate files and subdirectories', () => {
    expect(listDirectoryChildren(paths, 'docs/')).toEqual([
      'docs/guide.md',
      'docs/images/',
    ]);
  });

  it('normalizes directory path without trailing slash', () => {
    expect(listDirectoryChildren(paths, 'docs')).toEqual([
      'docs/guide.md',
      'docs/images/',
    ]);
  });

  it('lists workspace root children', () => {
    expect(listDirectoryChildren(paths, '')).toEqual([
      'docs/',
      'README.md',
      'src/',
    ]);
  });

  it('returns empty for empty directory', () => {
    expect(listDirectoryChildren(paths, 'missing/')).toEqual([]);
  });
});
