/** 合成长文，供 prepare 基准测试使用 */
export function buildLargeMarkdownFixture(options: {
  paragraphCount?: number;
  codeBlockCount?: number;
  inlineMathPerParagraph?: number;
}): string {
  const paragraphCount = options.paragraphCount ?? 400;
  const codeBlockCount = options.codeBlockCount ?? 40;
  const inlineMathPerParagraph = options.inlineMathPerParagraph ?? 2;
  const parts: string[] = [];

  for (let i = 0; i < paragraphCount; i += 1) {
    const mathParts = Array.from({ length: inlineMathPerParagraph }, (_, j) => {
      const n = i * inlineMathPerParagraph + j;
      return `系数 $a_{${n}} = ${n % 7}$`;
    }).join('，');
    parts.push(
      `## 章节 ${i + 1}\n\n` +
        `正文段落 ${i}：比较 a < b 且 <br> 换行。${mathParts}。\n\n` +
        `引用 \`code_${i}\` 与 [[note-${i}]]。`,
    );
    if (i % Math.max(1, Math.floor(paragraphCount / codeBlockCount)) === 0) {
      parts.push(
        '```typescript\n' +
          `function chunk_${i}(x: number): number {\n` +
          `  return x + ${i};\n` +
          '}\n```',
      );
    }
    if (i % 17 === 0) {
      parts.push('$$\nE = mc^2 \\cdot ' + i + '\n$$');
    }
    if (i % 23 === 0) {
      parts.push('```mermaid\nflowchart LR\n  A' + i + ' --> B' + i + '\n```');
    }
  }

  parts.push('![[assets/demo.png]]\n\n![](images/photo.jpg)');
  return parts.join('\n\n');
}
