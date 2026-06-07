const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i;
const PDF_EXT = /\.pdf$/i;
const DOCX_EXT = /\.docx$/i;
const PPTX_EXT = /\.pptx$/i;
const AUDIO_EXT = /\.(mp3|wav|ogg|m4a|aac|flac|weba)$/i;
const VIDEO_EXT = /\.(mp4|webm|mov|m4v|ogv|mkv|avi)$/i;
const CSV_EXT = /\.csv$/i;
const XLSX_EXT = /\.xlsx$/i;
const IPYNB_EXT = /\.ipynb$/i;

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

export function isVideoPath(relativePath: string): boolean {
  const base = relativePath.replace(/\/$/, '');
  return VIDEO_EXT.test(base);
}

export function isCsvPath(relativePath: string): boolean {
  const base = relativePath.replace(/\/$/, '');
  return CSV_EXT.test(base);
}

export function isXlsxPath(relativePath: string): boolean {
  const base = relativePath.replace(/\/$/, '');
  return XLSX_EXT.test(base);
}

export function isIpynbPath(relativePath: string): boolean {
  const base = relativePath.replace(/\/$/, '');
  return IPYNB_EXT.test(base);
}

export function isDirectoryPath(path: string): boolean {
  return path.endsWith('/');
}
