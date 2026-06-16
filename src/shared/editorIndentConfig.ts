export interface EditorIndentSettings {
  /** true：Tab 插入空格；false：插入制表符 */
  insert_spaces: boolean;
  /** 缩进宽度（空格数或 Tab 显示宽度） */
  tab_size: number;
}

export const DEFAULT_EDITOR_INDENT: EditorIndentSettings = {
  insert_spaces: true,
  tab_size: 2,
};

const MIN_TAB_SIZE = 1;
const MAX_TAB_SIZE = 8;

function parseTabSize(value: unknown): number {
  if (typeof value === 'number' && Number.isInteger(value)) {
    if (value >= MIN_TAB_SIZE && value <= MAX_TAB_SIZE) {
      return value;
    }
  }
  return DEFAULT_EDITOR_INDENT.tab_size;
}

export function parseEditorIndentSettings(
  raw: unknown,
): EditorIndentSettings {
  const block = (raw && typeof raw === 'object' ? raw : {}) as Record<
    string,
    unknown
  >;
  return {
    insert_spaces:
      typeof block.insert_spaces === 'boolean'
        ? block.insert_spaces
        : DEFAULT_EDITOR_INDENT.insert_spaces,
    tab_size: parseTabSize(block.tab_size),
  };
}

export function indentUnitString(settings: EditorIndentSettings): string {
  return settings.insert_spaces
    ? ' '.repeat(settings.tab_size)
    : '\t';
}
