import { workspaceAbsolutePath } from './workspaceAbsolutePath';

function toFileDirectoryUrl(absolutePath: string): string {
  const normalized = absolutePath.replace(/\\/g, '/');
  const dir = normalized.replace(/\/[^/]+$/, '');
  if (/^[A-Za-z]:/.test(dir)) {
    return `file:///${dir}/`;
  }
  return `file://${dir}/`;
}

export function htmlPreviewBaseHref(
  workspaceRoot: string,
  relativePath: string,
): string {
  return toFileDirectoryUrl(workspaceAbsolutePath(workspaceRoot, relativePath));
}

export function buildHtmlPreviewDocument(
  html: string,
  baseHref: string,
): string {
  const baseTag = `<base href="${baseHref}">`;
  const trimmed = html.trim();
  if (!trimmed) {
    return `<!DOCTYPE html><html><head>${baseTag}</head><body></body></html>`;
  }
  if (/<html[\s>]/i.test(trimmed)) {
    if (/<head[\s>]/i.test(trimmed)) {
      return trimmed.replace(/<head(\s[^>]*)?>/i, (match) => `${match}${baseTag}`);
    }
    return trimmed.replace(
      /<html(\s[^>]*)?>/i,
      (match) => `${match}<head>${baseTag}</head>`,
    );
  }
  return `<!DOCTYPE html><html><head>${baseTag}</head><body>${html}</body></html>`;
}
