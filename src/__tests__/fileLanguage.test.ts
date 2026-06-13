import {
  codeBlockLanguageLabel,
  getSourceLanguageId,
  getSourceLanguageLabel,
  isHtmlPath,
  isMarkdownPath,
  isP5Path,
  isStrudelPath,
} from '../renderer/lib/fileLanguage';

describe('fileLanguage', () => {
  it('detects markdown paths', () => {
    expect(isMarkdownPath('notes.md')).toBe(true);
    expect(isMarkdownPath('doc.mdx')).toBe(true);
    expect(isMarkdownPath(null)).toBe(true);
    expect(isMarkdownPath('main.ts')).toBe(false);
  });

  it('detects html paths', () => {
    expect(isHtmlPath('index.html')).toBe(true);
    expect(isHtmlPath('legacy.htm')).toBe(true);
    expect(isHtmlPath('notes.md')).toBe(false);
    expect(isHtmlPath(null)).toBe(false);
  });

  it('detects strudel paths', () => {
    expect(isStrudelPath('music/beat.strudel')).toBe(true);
    expect(isStrudelPath('BEAT.STRUDEL')).toBe(true);
    expect(isStrudelPath('notes.md')).toBe(false);
    expect(isStrudelPath(null)).toBe(false);
  });

  it('detects p5 paths', () => {
    expect(isP5Path('sketches/demo.p5')).toBe(true);
    expect(isP5Path('SKETCH.P5')).toBe(true);
    expect(isP5Path('notes.md')).toBe(false);
    expect(isP5Path(null)).toBe(false);
  });

  it('maps extensions to source languages', () => {
    expect(getSourceLanguageId('app.ts')).toBe('typescript');
    expect(getSourceLanguageId('data.json')).toBe('json');
    expect(getSourceLanguageId('notebook.ipynb')).toBe('json');
    expect(getSourceLanguageId('beat.strudel')).toBe('javascript');
    expect(getSourceLanguageId('sketch.p5')).toBe('javascript');
    expect(getSourceLanguageId('readme.md')).toBe('markdown');
    expect(getSourceLanguageId('paper.tex')).toBe('latex');
    expect(getSourceLanguageId('notes.org')).toBe('org');
    expect(getSourceLanguageId('main.scm')).toBe('scheme');
    expect(getSourceLanguageId('App.scala')).toBe('scala');
    expect(getSourceLanguageId('unknown')).toBe('plain');
  });

  it('provides human-readable labels', () => {
    expect(getSourceLanguageLabel('typescript')).toBe('TypeScript');
    expect(getSourceLanguageLabel('latex')).toBe('LaTeX');
    expect(getSourceLanguageLabel('org')).toBe('Org Mode');
    expect(getSourceLanguageLabel('scheme')).toBe('Scheme');
    expect(getSourceLanguageLabel('scala')).toBe('Scala');
    expect(getSourceLanguageLabel('plain')).toBe('Plain Text');
  });

  it('labels strudel code fences as Strudel', () => {
    expect(codeBlockLanguageLabel('strudel')).toBe('Strudel');
    expect(codeBlockLanguageLabel('STRUDEL')).toBe('Strudel');
  });
});
