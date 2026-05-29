const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i;

export function isImagePath(relativePath: string): boolean {
  const base = relativePath.replace(/\/$/, '');
  return IMAGE_EXT.test(base);
}

export function isDirectoryPath(path: string): boolean {
  return path.endsWith('/');
}
