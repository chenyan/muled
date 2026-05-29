import {
  filterWorkspacePathsByQuery,
  globPatternToRegExp,
  isGlobPattern,
  matchWorkspacePath,
} from '../shared/workspacePathGlob';

const SAMPLE_PATHS = [
  'README.md',
  'docs/',
  'docs/guide.md',
  'docs/api/reference.md',
  'src/',
  'src/index.ts',
  'src/components/Button.tsx',
];

describe('workspacePathGlob', () => {
  it('detects glob metacharacters', () => {
    expect(isGlobPattern('*.md')).toBe(true);
    expect(isGlobPattern('readme')).toBe(false);
  });

  it('matches substring when pattern has no glob chars', () => {
    expect(matchWorkspacePath('guide', 'docs/guide.md')).toBe(true);
    expect(matchWorkspacePath('Guide', 'docs/guide.md')).toBe(true);
    expect(matchWorkspacePath('missing', 'docs/guide.md')).toBe(false);
  });

  it('matches *.md in any directory', () => {
    expect(matchWorkspacePath('*.md', 'README.md')).toBe(true);
    expect(matchWorkspacePath('*.md', 'docs/guide.md')).toBe(true);
    expect(matchWorkspacePath('*.md', 'src/index.ts')).toBe(false);
  });

  it('matches path-scoped globs', () => {
    expect(matchWorkspacePath('docs/*.md', 'docs/guide.md')).toBe(true);
    expect(matchWorkspacePath('docs/*.md', 'docs/api/reference.md')).toBe(
      false,
    );
  });

  it('matches ** across directories', () => {
    expect(matchWorkspacePath('**/*.ts', 'src/index.ts')).toBe(true);
    expect(matchWorkspacePath('**/*.tsx', 'src/components/Button.tsx')).toBe(
      true,
    );
    expect(matchWorkspacePath('**/*.md', 'docs/api/reference.md')).toBe(true);
  });

  it('supports ? and character classes', () => {
    expect(globPatternToRegExp('a?c').test('abc')).toBe(true);
    expect(globPatternToRegExp('a?c').test('abbc')).toBe(false);
    expect(matchWorkspacePath('[rb]eadme.md', 'readme.md')).toBe(true);
  });

  it('supports brace alternates', () => {
    expect(matchWorkspacePath('*.{md,ts}', 'README.md')).toBe(true);
    expect(matchWorkspacePath('*.{md,ts}', 'src/index.ts')).toBe(true);
  });

  it('filterWorkspacePathsByQuery keeps ancestor directories', () => {
    const filtered = filterWorkspacePathsByQuery(SAMPLE_PATHS, '*.md');
    expect(filtered).toEqual([
      'README.md',
      'docs/',
      'docs/guide.md',
      'docs/api/reference.md',
    ]);
  });

  it('returns all paths for empty query', () => {
    expect(filterWorkspacePathsByQuery(SAMPLE_PATHS, '  ')).toEqual(
      SAMPLE_PATHS,
    );
  });
});
