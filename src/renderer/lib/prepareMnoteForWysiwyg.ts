import { splitObsidianFrontmatter } from './markdownFrontmatter';
import { prepareMarkdownForWysiwyg } from './prepareMarkdownForWysiwyg';
import { collapseMnoteEntriesFromWysiwyg } from './mnoteWysiwygTransform';
import { ensureWysiwygTrailingBlankLine } from './ensureWysiwygTrailingBlankLine';

/** WYSIWYG 载入：合并旧式展开条目为完整 fence，再复用 Markdown 管线 */
export function prepareMnoteForWysiwyg(raw: string): string {
  const split = splitObsidianFrontmatter(raw);
  if (!split) {
    return ensureWysiwygTrailingBlankLine(prepareMarkdownForWysiwyg(raw));
  }

  const normalizedBody = collapseMnoteEntriesFromWysiwyg(split.body);
  const normalized = `---\n${split.yaml.trimEnd()}\n---\n\n${normalizedBody.replace(/^\n+/, '')}`;
  return ensureWysiwygTrailingBlankLine(prepareMarkdownForWysiwyg(normalized));
}
