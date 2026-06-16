import {
  absolutePathToMuledFileUrl,
  muledFileUrlToAbsolutePath,
} from '../../shared/muledFileUrl';
import { MULED_FILE_PROTOCOL } from '../../shared/muledFileProtocol';

/** iframe 内点击链接时 postMessage 给预览宿主（备用，主路径为 iframe load 检测） */
export const HTML_PREVIEW_NAVIGATE_MESSAGE = 'muled-html-preview-navigate';

export interface HtmlPreviewLoadTarget {
  /** 传给 file.readBytes 的路径（相对或绝对） */
  readPath: string;
  absolutePath: string;
  baseHref: string;
  hash: string;
}

export function htmlPreviewBaseHrefFromAbsolute(
  absoluteFilePath: string,
): string {
  const normalized = absoluteFilePath.replace(/\\/g, '/');
  const slash = normalized.lastIndexOf('/');
  const dir = slash < 0 ? normalized : normalized.slice(0, slash + 1);
  return absolutePathToMuledFileUrl(dir || normalized);
}

export function workspaceRelativeFromAbsolute(
  workspaceRoot: string,
  absolutePath: string,
): string | null {
  const normRoot = workspaceRoot.replace(/\\/g, '/').replace(/\/+$/, '');
  const normAbs = absolutePath.replace(/\\/g, '/');
  const prefix = `${normRoot}/`;
  if (!normAbs.startsWith(prefix) && normAbs !== normRoot) {
    return null;
  }
  return normAbs === normRoot ? '' : normAbs.slice(prefix.length);
}

export function isHtmlPreviewPath(fileName: string): boolean {
  return /\.(x?html|htm)$/i.test(fileName);
}

function resolveAbsolutePath(baseDirAbsolute: string, relativeHref: string): string {
  const normalizedBase = baseDirAbsolute.replace(/\\/g, '/');
  const dir = normalizedBase.endsWith('/')
    ? normalizedBase
    : `${normalizedBase.slice(0, normalizedBase.lastIndexOf('/') + 1)}`;
  const stack = dir.split('/').filter((segment, index) => segment.length > 0 || index === 0);

  for (const part of relativeHref.replace(/\\/g, '/').split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') {
      if (stack.length > 1) stack.pop();
      continue;
    }
    stack.push(part);
  }

  if (stack[0] === '') {
    return stack.join('/');
  }
  return `/${stack.join('/')}`;
}

/** 用预览页 base 将链接 href 解析为绝对 muled-file URL */
export function resolveHtmlPreviewLinkUrl(
  rawHref: string,
  previewBaseHref: string,
): string | null {
  const trimmed = rawHref.trim();
  if (!trimmed || trimmed.startsWith('#') || /^javascript:/i.test(trimmed)) {
    return null;
  }
  if (trimmed.startsWith(`${MULED_FILE_PROTOCOL}:`)) {
    return trimmed;
  }
  if (!previewBaseHref.startsWith(`${MULED_FILE_PROTOCOL}:`)) {
    try {
      return new URL(trimmed, previewBaseHref).href ?? null;
    } catch {
      return null;
    }
  }

  try {
    const hashIndex = trimmed.indexOf('#');
    const hrefPath = hashIndex >= 0 ? trimmed.slice(0, hashIndex) : trimmed;
    const hrefHash = hashIndex >= 0 ? trimmed.slice(hashIndex) : '';
    const baseAbsolute = muledFileUrlToAbsolutePath(
      previewBaseHref.endsWith('/')
        ? previewBaseHref
        : `${previewBaseHref}/`,
    );
    const absolute = resolveAbsolutePath(baseAbsolute, hrefPath);
    return `${absolutePathToMuledFileUrl(absolute)}${hrefHash}`;
  } catch {
    return null;
  }
}

/** 将链接解析为预览加载目标；工作区相对路径不可用时回退绝对路径 */
export function resolveHtmlPreviewLoadTarget(
  href: string,
  workspaceRoot: string,
  previewBaseHref?: string,
): HtmlPreviewLoadTarget | null {
  const trimmed = href.trim();
  let muledHref = trimmed;
  if (!muledHref.startsWith(`${MULED_FILE_PROTOCOL}:`)) {
    if (!previewBaseHref) return null;
    muledHref = resolveHtmlPreviewLinkUrl(trimmed, previewBaseHref) ?? '';
  }
  if (!muledHref.startsWith(`${MULED_FILE_PROTOCOL}:`)) {
    return null;
  }

  const hashIndex = muledHref.indexOf('#');
  const hrefWithoutHash =
    hashIndex >= 0 ? muledHref.slice(0, hashIndex) : muledHref;
  const rawHash = hashIndex >= 0 ? muledHref.slice(hashIndex + 1) : '';
  let decodedHash = rawHash;
  if (rawHash) {
    try {
      decodedHash = decodeURIComponent(rawHash);
    } catch {
      decodedHash = rawHash;
    }
  }

  let absolute: string;
  try {
    absolute = muledFileUrlToAbsolutePath(hrefWithoutHash);
  } catch {
    return null;
  }

  const fileName = absolute.split('/').pop() ?? '';
  if (!isHtmlPreviewPath(fileName)) {
    return null;
  }

  const relative = workspaceRelativeFromAbsolute(workspaceRoot, absolute);
  return {
    readPath: relative ?? absolute,
    absolutePath: absolute,
    baseHref: htmlPreviewBaseHrefFromAbsolute(absolute),
    hash: decodedHash,
  };
}

/** 滚动到页内锚点（兼容 id 与 name，避免 hash 含 % 时被错误编码） */
export function scrollHtmlPreviewToHash(
  doc: Document | null | undefined,
  hash: string,
): boolean {
  if (!doc || !hash) {
    return false;
  }

  const byId = doc.getElementById(hash);
  if (byId) {
    byId.scrollIntoView();
    return true;
  }

  for (const anchor of doc.querySelectorAll('a[name]')) {
    if (anchor.getAttribute('name') === hash) {
      anchor.scrollIntoView();
      return true;
    }
  }

  return false;
}

/** @deprecated 使用 resolveHtmlPreviewLoadTarget */
export function resolveHtmlPreviewNavigateHref(
  href: string,
  workspaceRoot: string,
  previewBaseHref?: string,
): string | null {
  return resolveHtmlPreviewLoadTarget(href, workspaceRoot, previewBaseHref)
    ?.readPath ?? null;
}
