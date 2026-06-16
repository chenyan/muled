import {
  decodeHtmlBytes,
  findHtmlPreviewEncoding,
  HTML_PREVIEW_DEFAULT_ENCODING,
  HTML_PREVIEW_ENCODINGS,
} from '../renderer/lib/htmlPreviewEncodings';

describe('htmlPreviewEncodings', () => {
  it('lists common encodings for manual preview selection', () => {
    expect(HTML_PREVIEW_ENCODINGS.map((item) => item.id)).toEqual([
      'utf-8',
      'gbk',
      'gb18030',
      'gb2312',
      'big5',
      'utf-16le',
      'utf-16be',
      'iso-8859-1',
      'windows-1252',
      'shift_jis',
      'euc-kr',
    ]);
    expect(HTML_PREVIEW_DEFAULT_ENCODING).toBe('utf-8');
  });

  it('falls back to utf-8 for unknown encoding ids', () => {
    expect(findHtmlPreviewEncoding('unknown').id).toBe('utf-8');
  });

  it('decodes bytes with selected encoding', () => {
    const utf8Bytes = new TextEncoder().encode('你好');
    expect(decodeHtmlBytes(utf8Bytes, 'utf-8')).toBe('你好');
    expect(decodeHtmlBytes(utf8Bytes, 'gbk')).not.toBe('你好');
  });
});
