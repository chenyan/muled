import { MULED_FILE_PROTOCOL } from './muledFileProtocol';

function encodePathSegments(normalized: string): string {
  return normalized
    .split('/')
    .map((segment, index) => {
      if (index === 0 && segment === '') {
        return '';
      }
      if (/^[A-Za-z]:$/.test(segment)) {
        return segment;
      }
      return encodeURIComponent(segment);
    })
    .join('/');
}

/** 将绝对路径转为 muled-file:// URL */
export function absolutePathToMuledFileUrl(absolutePath: string): string {
  const normalized = absolutePath.replace(/\\/g, '/');
  const encoded = encodePathSegments(normalized);
  if (/^[A-Za-z]:\//.test(encoded)) {
    return `${MULED_FILE_PROTOCOL}:///${encoded}`;
  }
  if (encoded.startsWith('/')) {
    return `${MULED_FILE_PROTOCOL}://${encoded}`;
  }
  return `${MULED_FILE_PROTOCOL}:///${encoded}`;
}

function decodeMuledPath(pathname: string): string {
  return decodeURIComponent(pathname);
}

/**
 * 将 muled-file:// URL 还原为绝对路径。
 * Chromium 有时会把 muled-file:///Users/... 解析成 host=Users 的形式，需要合并 hostname。
 */
export function muledFileUrlToAbsolutePath(url: string): string {
  const prefix = `${MULED_FILE_PROTOCOL}://`;
  if (!url.startsWith(prefix)) {
    throw new Error(`Invalid ${MULED_FILE_PROTOCOL} URL: ${url}`);
  }

  const rest = url.slice(prefix.length);
  if (rest.startsWith('/')) {
    return decodeMuledPath(rest);
  }

  const parsed = new URL(url);
  if (!parsed.hostname || parsed.hostname === 'localhost') {
    return decodeMuledPath(parsed.pathname);
  }

  return decodeMuledPath(`/${parsed.hostname}${parsed.pathname}`);
}
