/** 在文档末尾追加一段文本，必要时补换行 */
export function appendTextAtDocumentEnd(
  document: string,
  text: string,
): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return document;
  }
  if (!document) {
    return `${trimmed}\n`;
  }
  const needsGap = !document.endsWith('\n');
  return `${document}${needsGap ? '\n' : ''}${trimmed}\n`;
}
