const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i;
const PDF_EXT = /\.pdf$/i;

export function isImagePath(relativePath: string): boolean {
  const base = relativePath.replace(/\/$/, '');
  return IMAGE_EXT.test(base);
}

export function isPdfPath(relativePath: string): boolean {
  const base = relativePath.replace(/\/$/, '');
  return PDF_EXT.test(base);
}

export function isDirectoryPath(path: string): boolean {
  return path.endsWith('/');
}
