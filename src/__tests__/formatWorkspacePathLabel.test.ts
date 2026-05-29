import { formatWorkspacePathLabel } from '../shared/formatWorkspacePathLabel';

describe('formatWorkspacePathLabel', () => {
  const home = '/Users/test';

  it('shortens paths under home directory', () => {
    expect(formatWorkspacePathLabel(home, home)).toBe('~');
    expect(formatWorkspacePathLabel(`${home}/projects/muled`, home)).toBe(
      '~/projects/muled',
    );
  });

  it('leaves paths outside home unchanged', () => {
    expect(formatWorkspacePathLabel('/var/log', home)).toBe('/var/log');
  });
});
