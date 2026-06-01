import {
  clearWikiImagePreviewCache,
  resolveWikiImagePreview,
} from '../renderer/lib/resolveWikiImagePreview';

describe('resolveWikiImagePreview', () => {
  beforeEach(() => {
    clearWikiImagePreviewCache();
    window.muled = {
      config: {
        get: jest.fn(),
        getWysiwygCss: jest.fn(),
        onThemeChanged: () => () => undefined,
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

  it('loads workspace images for muled-wiki src', async () => {
    (window.muled.file.readBinary as jest.Mock).mockResolvedValue({
      base64: 'abc',
      mime: 'image/png',
    });

    const result = await resolveWikiImagePreview(
      'muled-wiki:llm/att/foo.png',
      'notes/readme.md',
    );

    expect(result).toBe('data:image/png;base64,abc');
    expect(window.muled.file.readBinary).toHaveBeenCalledWith('llm/att/foo.png');
  });

  it('loads muled-file workspace images', async () => {
    (window.muled.file.readBinary as jest.Mock).mockResolvedValue({
      base64: 'qqq',
      mime: 'image/png',
    });

    const result = await resolveWikiImagePreview(
      'muled-file:cs/llm/att/foo.png',
      null,
    );

    expect(result).toBe('data:image/png;base64,qqq');
    expect(window.muled.file.readBinary).toHaveBeenCalledWith(
      'cs/llm/att/foo.png',
    );
  });

  it('falls back to document-relative paths', async () => {
    (window.muled.file.readBinary as jest.Mock).mockImplementation(
      async (path: string) => {
        if (path === 'notes/att/foo.png') {
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
  });
});
