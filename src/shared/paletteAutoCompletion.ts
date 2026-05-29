export interface PaletteCompletion {
  /** 补全后的整行命令，如 `cd ~/projects` */
  completedLine: string;
  /** 接在当前输入后的幽灵后缀（暗色展示） */
  ghostSuffix: string;
  /** 可选匹配总数，用于 Tab 循环 */
  matchCount: number;
}

/**
 * 从 `cd` 路径候选中选取一项补全。
 * @param line 当前命令行（可含 `cd ` 前缀后的部分路径）
 * @param candidateLabels 展示路径，如 `~/projects`
 */
export function getCdPaletteCompletion(
  line: string,
  candidateLabels: readonly string[],
  cycleIndex = 0,
): PaletteCompletion | null {
  if (!line.startsWith('cd ')) {
    return null;
  }

  const pathPartial = line.slice(3);
  const matches = candidateLabels
    .filter(
      (label) =>
        label.length > pathPartial.length &&
        label.toLowerCase().startsWith(pathPartial.toLowerCase()),
    )
    .sort((a, b) => a.localeCompare(b));

  if (matches.length === 0) {
    return null;
  }

  const index =
    ((cycleIndex % matches.length) + matches.length) % matches.length;
  const label = matches[index]!;
  const ghostSuffix = label.slice(pathPartial.length);

  return {
    completedLine: `cd ${label}`,
    ghostSuffix,
    matchCount: matches.length,
  };
}
