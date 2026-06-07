import {
  needsBinaryHydration,
  releaseTabBinaryPayload,
} from '../renderer/lib/tabResources';
import type { EditorTab } from '../renderer/types/tab';

function pdfTab(overrides: Partial<EditorTab> = {}): EditorTab {
  return {
    id: '1',
    relativePath: 'doc.pdf',
    kind: 'pdf',
    dirty: false,
    keybindingMode: 'vim',
    viewMode: 'source',
    content: '',
    truncated: false,
    fileSize: 0,
    pdfSrc: 'data:application/pdf;base64,abc',
    ...overrides,
  };
}

describe('releaseTabBinaryPayload', () => {
  it('strips pdfSrc from pdf tabs', () => {
    const released = releaseTabBinaryPayload(pdfTab());
    expect(released.pdfSrc).toBeUndefined();
    expect(released.relativePath).toBe('doc.pdf');
  });

  it('strips imageSrc from image tabs', () => {
    const released = releaseTabBinaryPayload({
      ...pdfTab(),
      kind: 'image',
      pdfSrc: undefined,
      imageSrc: 'data:image/png;base64,xyz',
    });
    expect(released.imageSrc).toBeUndefined();
  });

  it('strips audioSrc from audio tabs', () => {
    const released = releaseTabBinaryPayload({
      ...pdfTab(),
      kind: 'audio',
      pdfSrc: undefined,
      audioSrc: 'data:audio/mpeg;base64,abc',
    });
    expect(released.audioSrc).toBeUndefined();
  });

  it('strips videoSrc from video tabs', () => {
    const released = releaseTabBinaryPayload({
      ...pdfTab(),
      kind: 'video',
      pdfSrc: undefined,
      videoSrc: 'data:video/mp4;base64,abc',
    });
    expect(released.videoSrc).toBeUndefined();
  });

  it('strips docxSrc from docx tabs', () => {
    const released = releaseTabBinaryPayload({
      ...pdfTab(),
      kind: 'docx',
      pdfSrc: undefined,
      docxSrc: 'data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,abc',
    });
    expect(released.docxSrc).toBeUndefined();
  });

  it('strips pptxSrc from pptx tabs', () => {
    const released = releaseTabBinaryPayload({
      ...pdfTab(),
      kind: 'pptx',
      pdfSrc: undefined,
      pptxSrc:
        'data:application/vnd.openxmlformats-officedocument.presentationml.presentation;base64,abc',
    });
    expect(released.pptxSrc).toBeUndefined();
  });
});

describe('needsBinaryHydration', () => {
  it('is true when pdf tab has no pdfSrc', () => {
    expect(needsBinaryHydration(pdfTab({ pdfSrc: undefined }))).toBe(true);
  });

  it('is false when pdf tab already has pdfSrc', () => {
    expect(needsBinaryHydration(pdfTab())).toBe(false);
  });

  it('is true when audio tab has no audioSrc', () => {
    expect(
      needsBinaryHydration({
        ...pdfTab(),
        kind: 'audio',
        pdfSrc: undefined,
        audioSrc: undefined,
      }),
    ).toBe(true);
  });

  it('is true when video tab has no videoSrc', () => {
    expect(
      needsBinaryHydration({
        ...pdfTab(),
        kind: 'video',
        pdfSrc: undefined,
        videoSrc: undefined,
      }),
    ).toBe(true);
  });

  it('is true when docx tab has no docxSrc', () => {
    expect(
      needsBinaryHydration({
        ...pdfTab(),
        kind: 'docx',
        pdfSrc: undefined,
        docxSrc: undefined,
      }),
    ).toBe(true);
  });

  it('is true when pptx tab has no pptxSrc', () => {
    expect(
      needsBinaryHydration({
        ...pdfTab(),
        kind: 'pptx',
        pdfSrc: undefined,
        pptxSrc: undefined,
      }),
    ).toBe(true);
  });
});
