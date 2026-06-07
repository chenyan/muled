import { isImagePath, isVideoPath } from './mime';
import {
  MULED_FILE_SRC_PREFIX,
  MULED_FILE_VIDEO_SRC_PREFIX,
  WIKI_IMAGE_SRC_PREFIX,
  WIKI_VIDEO_SRC_PREFIX,
  isMuledWikiVideoSrc,
} from './normalizeMarkdownWikiImages';

const previewCache = new Map<string, string>();

function base64ToBlobUrl(base64: string, mime: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: mime });
  if (typeof URL.createObjectURL === 'function') {
    try {
      return URL.createObjectURL(blob);
    } catch {
      // fall through to data URL
    }
  }
  return `data:${mime};base64,${base64}`;
}

function revokePreviewUrl(url: string): void {
  if (url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}

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
  if (src.startsWith(WIKI_VIDEO_SRC_PREFIX)) {
    return src.slice(WIKI_VIDEO_SRC_PREFIX.length);
  }
  if (src.startsWith(MULED_FILE_VIDEO_SRC_PREFIX)) {
    return src.slice(MULED_FILE_VIDEO_SRC_PREFIX.length);
  }
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
  options?: { resolveRelativeToDocument?: boolean },
): string[] {
  const raw = imagePath.replace(/\\/g, '/');
  const vaultAbsolute = raw.startsWith('/');
  const normalized = raw.replace(/^\.\/+/, '').replace(/^\/+/, '');
  if (!normalized) {
    return [];
  }

  const resolveRelativeToDocument =
    options?.resolveRelativeToDocument !== false;

  // Obsidian：以 / 开头的 wiki 路径相对 vault 根，而非当前笔记目录
  if (vaultAbsolute || !resolveRelativeToDocument) {
    return [normalized];
  }

  const candidates: string[] = [];

  if (documentRelativePath) {
    const docDir = dirname(documentRelativePath);
    const docRelative = joinRelative(docDir, normalized);
    const vaultStylePath =
      Boolean(docDir) &&
      (normalized === docRelative || normalized.startsWith(`${docDir}/`));

    if (vaultStylePath) {
      candidates.push(normalized);
      if (docRelative !== normalized) {
        candidates.push(docRelative);
      }
    } else {
      candidates.push(docRelative);
      if (!candidates.includes(normalized)) {
        candidates.push(normalized);
      }
    }
  } else {
    candidates.push(normalized);
  }

  return [...new Set(candidates.filter(Boolean))];
}

export function clearWikiImagePreviewCache(): void {
  for (const url of previewCache.values()) {
    revokePreviewUrl(url);
  }
  previewCache.clear();
}

export async function resolveWikiImagePreview(
  src: string,
  documentRelativePath?: string | null,
): Promise<string> {
  try {
    if (isMuledWikiVideoSrc(src)) {
      return resolveWikiVideoPreview(src, documentRelativePath);
    }

    const imagePathFromWiki = src.startsWith(WIKI_IMAGE_SRC_PREFIX)
      ? src.slice(WIKI_IMAGE_SRC_PREFIX.length)
      : null;
    if (imagePathFromWiki && isVideoPath(imagePathFromWiki)) {
      return resolveWikiVideoPreview(
        `${WIKI_VIDEO_SRC_PREFIX}${imagePathFromWiki}`,
        documentRelativePath,
      );
    }

    if (isExternalSrc(src)) {
      return src;
    }

    const cached = previewCache.get(src);
    if (cached) {
      return cached;
    }

    const isWikiEmbed = src.startsWith(WIKI_IMAGE_SRC_PREFIX);
    const isMuledFile = src.startsWith(MULED_FILE_SRC_PREFIX);
    const imagePath = decodeURIComponent(stripMuledImagePrefix(src));
    const candidates = resolveWikiImagePathCandidates(
      imagePath,
      documentRelativePath,
      {
        // ![[...]] / muled-wiki：相对当前笔记目录；![](path) / muled-file：工作区相对路径
        resolveRelativeToDocument: isWikiEmbed || !isMuledFile,
      },
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

const BROKEN_VIDEO_URI =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="240" height="135">
      <rect x="0" y="0" width="240" height="135" fill="#111" stroke="#dc2626" stroke-width="2" stroke-dasharray="4" />
      <text x="120" y="72" text-anchor="middle" font-size="12" fill="#dc2626">视频加载失败</text>
    </svg>
  `);

export async function resolveWikiVideoPreview(
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

    const isWikiEmbed = src.startsWith(WIKI_VIDEO_SRC_PREFIX);
    const isMuledFile = src.startsWith(MULED_FILE_VIDEO_SRC_PREFIX);
    const videoPath = decodeURIComponent(stripMuledImagePrefix(src));
    const candidates = resolveWikiImagePathCandidates(
      videoPath,
      documentRelativePath,
      {
        resolveRelativeToDocument: isWikiEmbed || !isMuledFile,
      },
    );

    for (const candidate of candidates) {
      if (!isVideoPath(candidate)) {
        continue;
      }
      try {
        const { base64, mime } = await window.muled.file.readBinary(candidate);
        const blobUrl = base64ToBlobUrl(base64, mime);
        previewCache.set(src, blobUrl);
        return blobUrl;
      } catch {
        // try next candidate
      }
    }

    previewCache.set(src, BROKEN_VIDEO_URI);
    return BROKEN_VIDEO_URI;
  } catch {
    return BROKEN_VIDEO_URI;
  }
}
