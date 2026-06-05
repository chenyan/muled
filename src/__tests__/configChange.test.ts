import {
  didWorkspacePathChange,
  isSameWorkspacePath,
} from '../shared/configChange';

describe('configChange', () => {
  it('treats tilde and absolute paths as the same workspace', () => {
    expect(isSameWorkspacePath('~/projects', '~/projects')).toBe(true);
    expect(
      isSameWorkspacePath('/tmp/foo', '/tmp/foo'),
    ).toBe(true);
  });

  it('detects workspace path changes', () => {
    expect(didWorkspacePathChange('~/a', '~/a')).toBe(false);
    expect(didWorkspacePathChange('~/a', '~/b')).toBe(true);
  });
});
