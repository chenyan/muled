import { unified } from 'unified';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import parse from 'uniorg-parse';
import uniorg2rehype from 'uniorg-rehype';
import type { ResolvedTheme } from '../../shared/types/theme';
import { HTML_PREVIEW_WHEEL_MESSAGE } from './htmlPreviewDocument';
import { highlightHtmlCodeBlocks } from './notebookHighlighter';
import {
  buildOrgPreviewStyles,
  readOrgPreviewThemeVars,
  type OrgPreviewThemeVars,
} from './orgPreviewTheme';

const ORG_PREVIEW_WHEEL_SCRIPT = `<script>(function(){var WHEEL="${HTML_PREVIEW_WHEEL_MESSAGE}";document.addEventListener("wheel",function(e){window.parent.postMessage({type:WHEEL,x:e.clientX,y:e.clientY},"*");},true);})();</script>`;

const orgPreviewProcessor = unified()
  .use(parse)
  .use(uniorg2rehype)
  .use(rehypeSanitize)
  .use(rehypeStringify);

export interface OrgPreviewDocumentOptions {
  uiTheme?: ResolvedTheme;
  themeVars?: OrgPreviewThemeVars;
}

/** 将 Org 源码转为预览用 HTML 片段 */
export function convertOrgBodyToHtml(orgContent: string): string {
  try {
    const html = String(orgPreviewProcessor.processSync(orgContent));
    return highlightHtmlCodeBlocks(html);
  } catch {
    const escaped = orgContent
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `<pre>${escaped}</pre>`;
  }
}

/** 包装为 iframe srcDoc 完整 HTML 文档 */
export function buildOrgPreviewDocument(
  orgContent: string,
  options: OrgPreviewDocumentOptions = {},
): string {
  const uiTheme = options.uiTheme ?? 'light';
  const themeVars = options.themeVars ?? readOrgPreviewThemeVars();
  const body = convertOrgBodyToHtml(orgContent);
  const styles = buildOrgPreviewStyles(uiTheme, themeVars);
  return `<!DOCTYPE html><html><head><meta charset="utf-8">${styles}${ORG_PREVIEW_WHEEL_SCRIPT}</head><body>${body}</body></html>`;
}
