import {
  isAudioPath,
  isCsvPath,
  isDirectoryPath,
  isDocxPath,
  isImagePath,
  isIpynbPath,
  isPdfPath,
  isPptxPath,
  isVideoPath,
  isXlsxPath,
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

  it('detects video extensions', () => {
    expect(isVideoPath('clips/demo.mp4')).toBe(true);
    expect(isVideoPath('screen.webm')).toBe(true);
    expect(isVideoPath('camera.MOV')).toBe(true);
    expect(isVideoPath('readme.md')).toBe(false);
  });

  it('detects directory paths', () => {
    expect(isDirectoryPath('src/')).toBe(true);
    expect(isDirectoryPath('file.ts')).toBe(false);
  });

  it('detects csv extension', () => {
    expect(isCsvPath('data/sales.csv')).toBe(true);
    expect(isCsvPath('sales.CSV')).toBe(true);
    expect(isCsvPath('readme.md')).toBe(false);
  });

  it('detects ipynb extension', () => {
    expect(isIpynbPath('notebooks/demo.ipynb')).toBe(true);
    expect(isIpynbPath('demo.IPYNB')).toBe(true);
    expect(isIpynbPath('readme.md')).toBe(false);
  });

  it('detects xlsx extension', () => {
    expect(isXlsxPath('data/sales.xlsx')).toBe(true);
    expect(isXlsxPath('sales.XLSX')).toBe(true);
    expect(isXlsxPath('legacy.xls')).toBe(false);
    expect(isXlsxPath('readme.md')).toBe(false);
  });
});
