import {
  clearWikiImagePreviewCache,
  resolveWikiImagePathCandidates,
  resolveWikiImagePreview,
} from '../renderer/lib/resolveWikiImagePreview';

describe('resolveWikiImagePathCandidates', () => {
  it('prefers document directory for wiki-relative paths', () => {
    expect(
      resolveWikiImagePathCandidates('att/foo.png', 'notes/readme.md'),
    ).toEqual(['notes/att/foo.png', 'att/foo.png']);
  });

  it('resolves beside vault-root notes', () => {
    expect(resolveWikiImagePathCandidates('att/foo.png', 'readme.md')).toEqual([
      'att/foo.png',
    ]);
  });

  it('treats leading slash as vault-root absolute', () => {
    expect(
      resolveWikiImagePathCandidates('/att/foo.png', 'notes/readme.md'),
    ).toEqual(['att/foo.png']);
  });

  it('skips document join for workspace-relative muled-file paths', () => {
    expect(
      resolveWikiImagePathCandidates('cs/llm/att/foo.png', 'notes/readme.md', {
        resolveRelativeToDocument: false,
      }),
    ).toEqual(['cs/llm/att/foo.png']);
  });
});

describe('resolveWikiImagePreview', () => {
  beforeEach(() => {
    clearWikiImagePreviewCache();
    window.muled = {
      config: {
        get: jest.fn(),
        getWysiwygCss: jest.fn(),
        onThemeChanged: () => () => undefined,
        onConfigChanged: () => () => undefined,
      },
      workspace: {
        get: jest.fn(),
        list: jest.fn(),
        listChildren: jest.fn(),
        pdfOutline: jest.fn(),
        cd: jest.fn(),
        completeCd: jest.fn(),
      },
      file: {
        read: jest.fn(),
        readBinary: jest.fn(),
        write: jest.fn(),
      },
      ai: {
        complete: jest.fn(),
        translate: jest.fn(),
      },
      search: {
        start: jest.fn(),
        cancel: jest.fn(),
        onStream: () => () => undefined,
      },
    } as unknown as typeof window.muled;
  });

  it('loads wiki images relative to the open document first', async () => {
    (window.muled.file.readBinary as jest.Mock).mockResolvedValue({
      base64: 'abc',
      mime: 'image/png',
    });

    const result = await resolveWikiImagePreview(
      'muled-wiki:att/foo.png',
      'notes/readme.md',
    );

    expect(result).toBe('data:image/png;base64,abc');
    expect(window.muled.file.readBinary).toHaveBeenCalledWith(
      'notes/att/foo.png',
    );
  });

  it('loads muled-file workspace images without document prefix', async () => {
    (window.muled.file.readBinary as jest.Mock).mockResolvedValue({
      base64: 'qqq',
      mime: 'image/png',
    });

    const result = await resolveWikiImagePreview(
      'muled-file:cs/llm/att/foo.png',
      'notes/readme.md',
    );

    expect(result).toBe('data:image/png;base64,qqq');
    expect(window.muled.file.readBinary).toHaveBeenCalledWith(
      'cs/llm/att/foo.png',
    );
  });

  it('falls back to vault-root paths when document-relative is missing', async () => {
    (window.muled.file.readBinary as jest.Mock).mockImplementation(
      async (path: string) => {
        if (path === 'att/foo.png') {
          return { base64: 'xyz', mime: 'image/png' };
        }
        throw new Error('missing');
      },
    );

    const result = await resolveWikiImagePreview(
      'muled-wiki:att/foo.png',
      'notes/readme.md',
    );

    expect(result).toBe('data:image/png;base64,xyz');
    expect(window.muled.file.readBinary).toHaveBeenCalledTimes(2);
    expect(window.muled.file.readBinary).toHaveBeenNthCalledWith(
      1,
      'notes/att/foo.png',
    );
    expect(window.muled.file.readBinary).toHaveBeenNthCalledWith(2, 'att/foo.png');
  });
});
