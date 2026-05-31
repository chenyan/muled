import { splitTopLevelMarkdownBlocks } from './splitMarkdownBlocks';

export function wrapAsTxtCodeBlock(content: string): string {
  let fence = '```';
  while (content.includes(fence)) {
    fence += '`';
  }
  return `${fence}txt\n${content}\n${fence}`;
}

/**
 * 将无法解析的块降级为 txt 代码块，避免整篇文档导入失败。
 * attempt 1：逐块检测并包裹失败块；attempt 2：整篇包裹为代码块。
 */
export function recoverMarkdownForWysiwyg(
  source: string,
  attempt: number,
  canParse: (block: string) => boolean,
): string {
  const trimmed = source.trim();
  if (!trimmed) {
    return source;
  }

  if (attempt >= 2) {
    return wrapAsTxtCodeBlock(source);
  }

  const blocks = splitTopLevelMarkdownBlocks(source);
  if (blocks.length <= 1) {
    return wrapAsTxtCodeBlock(source);
  }

  let changed = false;
  const recovered = blocks.map((block) => {
    if (canParse(block)) {
      return block;
    }
    changed = true;
    return wrapAsTxtCodeBlock(block);
  });

  if (!changed) {
    return wrapAsTxtCodeBlock(source);
  }

  return recovered.join('\n\n');
}

/**
 * @deprecated 载入时不再调用；仅保留供测试与 parse-error 降级路径参考。
 * 预包裹 txt 代码块会污染磁盘内容，载入应只做可逆的 wiki/math 归一化。
 */
export function prepareMarkdownForWysiwyg(
  source: string,
  canParse: (block: string) => boolean,
): string {
  if (canParse(source)) {
    return source;
  }
  return recoverMarkdownForWysiwyg(source, 1, canParse);
}
