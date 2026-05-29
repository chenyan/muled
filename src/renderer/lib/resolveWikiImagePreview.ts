import { isImagePath } from './mime';
import {
  MULED_FILE_SRC_PREFIX,
  WIKI_IMAGE_SRC_PREFIX,
} from './normalizeMarkdownWikiImages';

const previewCache = new Map<string, string>();

const BROKEN_IMAGE_URI =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="120" height="80">
      <rect x="0" y="0" width="120" height="80" fill="none" stroke="#dc2626" stroke-width="2" stroke-dasharray="4" />
      <text x="60" y="44" text-anchor="middle" font-size="12" fill="#dc2626">图片加载失败</text>
    </svg>
  `);

function isExternalSrc(src: string): boolean {
  return (
    src.startsWith('data:') ||
    src.startsWith('http://') ||
    src.startsWith('https://') ||
    src.startsWith('blob:') ||
    src.startsWith('file:')
  );
}

function stripMuledImagePrefix(src: string): string {
  if (src.startsWith(WIKI_IMAGE_SRC_PREFIX)) {
    return src.slice(WIKI_IMAGE_SRC_PREFIX.length);
  }
  if (src.startsWith(MULED_FILE_SRC_PREFIX)) {
    return src.slice(MULED_FILE_SRC_PREFIX.length);
  }
  return src;
}

function dirname(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, '/');
  const index = normalized.lastIndexOf('/');
  if (index <= 0) {
    return '';
  }
  return normalized.slice(0, index);
}

function joinRelative(baseDir: string, imagePath: string): string {
  const parts = [
    ...baseDir.split('/').filter(Boolean),
    ...imagePath.replace(/\\/g, '/').split('/').filter(Boolean),
  ];
  const resolved: string[] = [];
  for (const part of parts) {
    if (part === '.') {
      continue;
    }
    if (part === '..') {
      resolved.pop();
      continue;
    }
    resolved.push(part);
  }
  return resolved.join('/');
}

export function resolveWikiImagePathCandidates(
  imagePath: string,
  documentRelativePath?: string | null,
): string[] {
  const normalized = imagePath.replace(/\\/g, '/').replace(/^\.\/+/, '');
  const candidates: string[] = [];

  if (normalized) {
    candidates.push(normalized);
  }

  if (documentRelativePath) {
    const docDir = dirname(documentRelativePath);
    if (docDir) {
      candidates.push(joinRelative(docDir, normalized));
    }
  }

  return [...new Set(candidates.filter(Boolean))];
}

export function clearWikiImagePreviewCache(): void {
  previewCache.clear();
}

export async function resolveWikiImagePreview(
  src: string,
  documentRelativePath?: string | null,
): Promise<string> {
  try {
    if (isExternalSrc(src)) {
      return src;
    }

    const cached = previewCache.get(src);
    if (cached) {
      return cached;
    }

    const imagePath = decodeURIComponent(stripMuledImagePrefix(src));
    const candidates = resolveWikiImagePathCandidates(
      imagePath,
      documentRelativePath,
    );

    for (const candidate of candidates) {
      if (!isImagePath(candidate)) {
        continue;
      }
      try {
        const { base64, mime } = await window.muled.file.readBinary(candidate);
        const dataUri = `data:${mime};base64,${base64}`;
        previewCache.set(src, dataUri);
        return dataUri;
      } catch {
        // try next candidate
      }
    }

    previewCache.set(src, BROKEN_IMAGE_URI);
    return BROKEN_IMAGE_URI;
  } catch {
    return BROKEN_IMAGE_URI;
  }
}
