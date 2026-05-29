import {
  getSourceLanguageId,
  getSourceLanguageLabel,
  isMarkdownPath,
} from '../renderer/lib/fileLanguage';

describe('fileLanguage', () => {
  it('detects markdown paths', () => {
    expect(isMarkdownPath('notes.md')).toBe(true);
    expect(isMarkdownPath('doc.mdx')).toBe(true);
    expect(isMarkdownPath(null)).toBe(true);
    expect(isMarkdownPath('main.ts')).toBe(false);
  });

  it('maps extensions to source languages', () => {
    expect(getSourceLanguageId('app.ts')).toBe('typescript');
    expect(getSourceLanguageId('data.json')).toBe('json');
    expect(getSourceLanguageId('readme.md')).toBe('markdown');
    expect(getSourceLanguageId('unknown')).toBe('plain');
  });

  it('provides human-readable labels', () => {
    expect(getSourceLanguageLabel('typescript')).toBe('TypeScript');
    expect(getSourceLanguageLabel('plain')).toBe('Plain Text');
  });
});
