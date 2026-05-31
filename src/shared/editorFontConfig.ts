export interface EditorFontSettings {
  font_family: string;
  font_size: number;
}

export const DEFAULT_SOURCE_FONT: EditorFontSettings = {
  font_family:
    'ui-monospace, SFMono-Regular, "Sarasa Mono SC", "Source Han Mono SC", Menlo, Monaco, Consolas, monospace',
  font_size: 13,
};

export const DEFAULT_WYSIWYG_FONT: EditorFontSettings = {
  font_family:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  font_size: 15,
};

const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 96;

function parseFontSize(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value >= MIN_FONT_SIZE && value <= MAX_FONT_SIZE) {
      return Math.round(value);
    }
    return fallback;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const match = /^(\d+(?:\.\d+)?)\s*px?$/i.exec(trimmed);
    if (match) {
      const parsed = Number(match[1]);
      if (parsed >= MIN_FONT_SIZE && parsed <= MAX_FONT_SIZE) {
        return Math.round(parsed);
      }
    }
  }
  return fallback;
}

export function parseEditorFontSettings(
  raw: unknown,
  defaults: EditorFontSettings,
): EditorFontSettings {
  const block = (raw && typeof raw === 'object' ? raw : {}) as Record<
    string,
    unknown
  >;
  const family =
    typeof block.font_family === 'string' && block.font_family.trim().length > 0
      ? block.font_family.trim()
      : defaults.font_family;
  return {
    font_family: family,
    font_size: parseFontSize(block.font_size, defaults.font_size),
  };
}
