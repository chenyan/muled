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
});

describe('needsBinaryHydration', () => {
  it('is true when pdf tab has no pdfSrc', () => {
    expect(needsBinaryHydration(pdfTab({ pdfSrc: undefined }))).toBe(true);
  });

  it('is false when pdf tab already has pdfSrc', () => {
    expect(needsBinaryHydration(pdfTab())).toBe(false);
  });
});
