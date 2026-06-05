const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i;
const PDF_EXT = /\.pdf$/i;
const DOCX_EXT = /\.docx$/i;
const PPTX_EXT = /\.pptx$/i;
const AUDIO_EXT = /\.(mp3|wav|ogg|m4a|aac|flac|weba)$/i;

export function isImagePath(relativePath: string): boolean {
  const base = relativePath.replace(/\/$/, '');
  return IMAGE_EXT.test(base);
}

export function isPdfPath(relativePath: string): boolean {
  const base = relativePath.replace(/\/$/, '');
  return PDF_EXT.test(base);
}

export function isDocxPath(relativePath: string): boolean {
  const base = relativePath.replace(/\/$/, '');
  return DOCX_EXT.test(base);
}

export function isPptxPath(relativePath: string): boolean {
  const base = relativePath.replace(/\/$/, '');
  return PPTX_EXT.test(base);
}

export function isAudioPath(relativePath: string): boolean {
  const base = relativePath.replace(/\/$/, '');
  return AUDIO_EXT.test(base);
}

export function isDirectoryPath(path: string): boolean {
  return path.endsWith('/');
}
