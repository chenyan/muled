import {
  absolutePathToMuledFileUrl,
} from '../../shared/muledFileUrl';
import {
  HTML_PREVIEW_NAVIGATE_MESSAGE,
} from './htmlPreviewNavigate';
import { workspaceAbsolutePath } from './workspaceAbsolutePath';

/** @deprecated 使用 absolutePathToMuledFileUrl */
export const toMuledFileUrl = absolutePathToMuledFileUrl;

function toMuledFileDirectoryUrl(absoluteFilePath: string): string {
  const normalized = absoluteFilePath.replace(/\\/g, '/');
  const slash = normalized.lastIndexOf('/');
  const dir = slash < 0 ? '' : normalized.slice(0, slash + 1);
  return absolutePathToMuledFileUrl(dir || normalized);
}

export function htmlPreviewBaseHref(
  workspaceRoot: string,
  relativePath: string,
): string {
  return toMuledFileDirectoryUrl(
    workspaceAbsolutePath(workspaceRoot, relativePath),
  );
}

export function htmlPreviewFileUrl(
  workspaceRoot: string,
  relativePath: string,
): string {
  return absolutePathToMuledFileUrl(
    workspaceAbsolutePath(workspaceRoot, relativePath),
  );
}

/** iframe 内右键时 postMessage 给预览宿主，用于弹出编码菜单 */
export const HTML_PREVIEW_CONTEXT_MENU_MESSAGE =
  'muled-html-preview-contextmenu';

/** iframe 内滚轮时 postMessage 给预览宿主，用于全局滚动手势追踪 */
export const HTML_PREVIEW_WHEEL_MESSAGE = 'muled-html-preview-wheel';

export { HTML_PREVIEW_NAVIGATE_MESSAGE };

const HTML_PREVIEW_BRIDGE_SCRIPT = `<script>(function(){var CTX="${HTML_PREVIEW_CONTEXT_MENU_MESSAGE}";var NAV="${HTML_PREVIEW_NAVIGATE_MESSAGE}";var WHEEL="${HTML_PREVIEW_WHEEL_MESSAGE}";function previewBaseHref(){var base=document.querySelector("base");return base&&base.getAttribute("href")?base.getAttribute("href"):"";}document.addEventListener("contextmenu",function(e){e.preventDefault();var sel=window.getSelection?window.getSelection().toString():"";window.parent.postMessage({type:CTX,x:e.clientX,y:e.clientY,selection:sel},"*");},true);document.addEventListener("click",function(e){var anchor=e.target&&e.target.closest?e.target.closest("a[href]"):null;if(!anchor)return;var raw=anchor.getAttribute("href");if(!raw||raw.charAt(0)==="#"||/^javascript:/i.test(raw))return;e.preventDefault();var base=previewBaseHref();window.parent.postMessage({type:NAV,href:raw,baseHref:base},"*");},true);document.addEventListener("wheel",function(e){window.parent.postMessage({type:WHEEL,x:e.clientX,y:e.clientY},"*");},true);})();</script>`;

function injectHtmlPreviewBridge(html: string): string {
  if (/<\/head>/i.test(html)) {
    return html.replace(/<\/head>/i, `${HTML_PREVIEW_BRIDGE_SCRIPT}</head>`);
  }
  if (/<head[\s>]/i.test(html)) {
    return html.replace(
      /<head(\s[^>]*)?>/i,
      (match) => `${match}${HTML_PREVIEW_BRIDGE_SCRIPT}`,
    );
  }
  return html.replace(
    /<html(\s[^>]*)?>/i,
    (match) => `${match}<head>${HTML_PREVIEW_BRIDGE_SCRIPT}</head>`,
  );
}

export function buildHtmlPreviewDocument(
  html: string,
  baseHref: string,
): string {
  const baseTag = `<base href="${baseHref}">`;
  const trimmed = html.trim();
  let doc: string;
  if (!trimmed) {
    doc = `<!DOCTYPE html><html><head>${baseTag}</head><body></body></html>`;
  } else if (/<html[\s>]/i.test(trimmed)) {
    if (/<head[\s>]/i.test(trimmed)) {
      doc = trimmed.replace(
        /<head(\s[^>]*)?>/i,
        (match) => `${match}${baseTag}`,
      );
    } else {
      doc = trimmed.replace(
        /<html(\s[^>]*)?>/i,
        (match) => `${match}<head>${baseTag}</head>`,
      );
    }
  } else {
    doc = `<!DOCTYPE html><html><head>${baseTag}</head><body>${html}</body></html>`;
  }
  return injectHtmlPreviewBridge(doc);
}
