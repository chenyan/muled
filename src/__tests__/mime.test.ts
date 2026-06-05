import {
  isAudioPath,
  isDirectoryPath,
  isDocxPath,
  isImagePath,
  isPdfPath,
  isPptxPath,
} from '../renderer/lib/mime';

describe('mime', () => {
  it('detects image extensions', () => {
    expect(isImagePath('photo.png')).toBe(true);
    expect(isImagePath('dir/photo.JPG')).toBe(true);
    expect(isImagePath('readme.md')).toBe(false);
  });

  it('detects pdf extension', () => {
    expect(isPdfPath('docs/guide.pdf')).toBe(true);
    expect(isPdfPath('readme.md')).toBe(false);
  });

  it('detects docx extension', () => {
    expect(isDocxPath('docs/report.docx')).toBe(true);
    expect(isDocxPath('report.DOCX')).toBe(true);
    expect(isDocxPath('readme.md')).toBe(false);
  });

  it('detects pptx extension', () => {
    expect(isPptxPath('slides/deck.pptx')).toBe(true);
    expect(isPptxPath('deck.PPTX')).toBe(true);
    expect(isPptxPath('readme.md')).toBe(false);
  });

  it('detects audio extensions', () => {
    expect(isAudioPath('music/song.mp3')).toBe(true);
    expect(isAudioPath('voice.WAV')).toBe(true);
    expect(isAudioPath('track.flac')).toBe(true);
    expect(isAudioPath('readme.md')).toBe(false);
  });

  it('detects directory paths', () => {
    expect(isDirectoryPath('src/')).toBe(true);
    expect(isDirectoryPath('file.ts')).toBe(false);
  });
});
