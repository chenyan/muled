import { denormalizeInlineMathSpans, denormalizeMarkdownMath } from './denormalizeMarkdownMath';
import { denormalizeMarkdownHtmlTags } from './denormalizeMarkdownHtmlTags';
import { exportWikiLinksFromMarkdown } from './normalizeMarkdownWikiLinks';
import { isImagePath } from './mime';

/**
 * 仅 WYSIWYG 编辑器内存中的图片 src 前缀，不得写入磁盘。
 * - muled-wiki: 来自 ![[path]]
 * - muled-file: 来自 ![](workspace/relative/path)
 */
export const WIKI_IMAGE_SRC_PREFIX = 'muled-wiki:';
export const MULED_FILE_SRC_PREFIX = 'muled-file:';

/** Obsidian 风格嵌入：![[path/to/image.png]] */
const WIKI_IMAGE_EMBED_RE = /!\[\[([^\]]+)\]\]/g;

/** 导出时还原 wiki 嵌入语法 */
const WIKI_IMAGE_MARKDOWN_RE = /!\[([^\]]*)\]\(muled-wiki:([^)]+)\)/g;

/** 导出时还原标准 Markdown 工作区图片 */
const MULED_FILE_MARKDOWN_RE = /!\[([^\]]*)\]\(muled-file:([^)]+)\)/g;

const MARKDOWN_IMAGE_RE = /!\[([^\]]*)\]\(([^)]+)\)/g;

function isExternalImageUrl(url: string): boolean {
  const clean = url.trim();
  return (
    clean.startsWith('data:') ||
    clean.startsWith('http://') ||
    clean.startsWith('https://') ||
    clean.startsWith('blob:') ||
    clean.startsWith('file:')
  );
}

function isWorkspaceRelativeImageUrl(url: string): boolean {
  const clean = url.trim().split(/[#?]/)[0];
  if (!clean || isExternalImageUrl(clean)) {
    return false;
  }
  if (
    clean.startsWith(WIKI_IMAGE_SRC_PREFIX) ||
    clean.startsWith(MULED_FILE_SRC_PREFIX)
  ) {
    return false;
  }
  return isImagePath(clean);
}

export function exportWikiImageEmbedMarkdown(path: string, alt: string): string {
  const trimmed = path.trim();
  if (!trimmed) {
    return '';
  }
  if (alt) {
    return `![[${trimmed}|${alt}]]`;
  }
  return `![[${trimmed}]]`;
}

function exportMarkdownImage(path: string, alt: string): string {
  const trimmed = path.trim();
  if (!trimmed) {
    return '';
  }
  if (alt) {
    return `![${alt}](${trimmed})`;
  }
  return `![](${trimmed})`;
}

function splitWikiImageEmbed(raw: string): { path: string; alt: string } {
  const trimmed = raw.trim();
  const pipeIndex = trimmed.indexOf('|');
  if (pipeIndex === -1) {
    return { path: trimmed, alt: '' };
  }
  return {
    path: trimmed.slice(0, pipeIndex).trim(),
    alt: trimmed.slice(pipeIndex + 1).trim(),
  };
}

/** 仅用于 WYSIWYG 载入（setMarkdown），勿用于更新 tab.content */
export function normalizeMarkdownWikiImages(source: string): string {
  const withWikiEmbeds = source.replace(WIKI_IMAGE_EMBED_RE, (_, rawPath: string) => {
    const { path, alt } = splitWikiImageEmbed(rawPath);
    if (!path) {
      return _;
    }
    return `![${alt}](${WIKI_IMAGE_SRC_PREFIX}${path})`;
  });

  return withWikiEmbeds.replace(
    MARKDOWN_IMAGE_RE,
    (match, alt: string, url: string) => {
      const cleanUrl = url.trim();
      if (
        cleanUrl.startsWith(WIKI_IMAGE_SRC_PREFIX) ||
        cleanUrl.startsWith(MULED_FILE_SRC_PREFIX)
      ) {
        return match;
      }
      if (!isWorkspaceRelativeImageUrl(cleanUrl)) {
        return match;
      }
      return `![${alt}](${MULED_FILE_SRC_PREFIX}${cleanUrl})`;
    },
  );
}

/** 将 WYSIWYG 内部图片 URL 还原为磁盘格式 */
export function exportWikiImagesFromMarkdown(source: string): string {
  return source
    .replace(MULED_FILE_MARKDOWN_RE, (_, alt: string, imagePath: string) =>
      exportMarkdownImage(imagePath, alt),
    )
    .replace(WIKI_IMAGE_MARKDOWN_RE, (_, alt: string, imagePath: string) =>
      exportWikiImageEmbedMarkdown(imagePath, alt),
    );
}

/** 从编辑器读取 markdown 时统一走此函数，避免内部前缀泄漏到 tab / 磁盘 */
export function exportMarkdownFromWysiwyg(
  source: string,
  original?: string,
): string {
  return denormalizeMarkdownMath(
    denormalizeInlineMathSpans(
      denormalizeMarkdownHtmlTags(
        exportWikiLinksFromMarkdown(exportWikiImagesFromMarkdown(source)),
      ),
    ),
    original,
  );
}
