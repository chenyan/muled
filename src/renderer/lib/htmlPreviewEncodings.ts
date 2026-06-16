export interface HtmlPreviewEncoding {
  id: string;
  label: string;
  decoderLabel: string;
}

/** HTML 预览常见字符编码（手动选择用） */
export const HTML_PREVIEW_ENCODINGS: readonly HtmlPreviewEncoding[] = [
  { id: 'utf-8', label: 'UTF-8', decoderLabel: 'utf-8' },
  { id: 'gbk', label: 'GBK', decoderLabel: 'gbk' },
  { id: 'gb18030', label: 'GB18030', decoderLabel: 'gb18030' },
  { id: 'gb2312', label: 'GB2312', decoderLabel: 'gbk' },
  { id: 'big5', label: 'Big5', decoderLabel: 'big5' },
  { id: 'utf-16le', label: 'UTF-16 LE', decoderLabel: 'utf-16le' },
  { id: 'utf-16be', label: 'UTF-16 BE', decoderLabel: 'utf-16be' },
  { id: 'iso-8859-1', label: 'ISO-8859-1', decoderLabel: 'iso-8859-1' },
  { id: 'windows-1252', label: 'Windows-1252', decoderLabel: 'windows-1252' },
  { id: 'shift_jis', label: 'Shift_JIS', decoderLabel: 'shift_jis' },
  { id: 'euc-kr', label: 'EUC-KR', decoderLabel: 'euc-kr' },
] as const;

export const HTML_PREVIEW_DEFAULT_ENCODING = 'utf-8';

export function findHtmlPreviewEncoding(
  encodingId: string,
): HtmlPreviewEncoding {
  return (
    HTML_PREVIEW_ENCODINGS.find((item) => item.id === encodingId) ??
    HTML_PREVIEW_ENCODINGS[0]
  );
}

export function decodeHtmlBytes(
  data: ArrayBuffer | ArrayBufferView,
  encodingId: string,
): string {
  const encoding = findHtmlPreviewEncoding(encodingId);
  try {
    return new TextDecoder(encoding.decoderLabel, { fatal: false }).decode(data);
  } catch {
    return new TextDecoder('utf-8', { fatal: false }).decode(data);
  }
}
