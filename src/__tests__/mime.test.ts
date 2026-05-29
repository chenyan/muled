import { isDirectoryPath, isImagePath } from '../renderer/lib/mime';

describe('mime', () => {
  it('detects image extensions', () => {
    expect(isImagePath('photo.png')).toBe(true);
    expect(isImagePath('dir/photo.JPG')).toBe(true);
    expect(isImagePath('readme.md')).toBe(false);
  });

  it('detects directory paths', () => {
    expect(isDirectoryPath('src/')).toBe(true);
    expect(isDirectoryPath('file.ts')).toBe(false);
  });
});
