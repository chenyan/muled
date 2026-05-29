/** 是否包含 glob 元字符（非纯文本子串搜索） */
export function isGlobPattern(query: string): boolean {
  return /[*?[{]/.test(query);
}

/** 与 @pierre/trees 搜索框一致：trim、反斜杠转正斜杠、小写 */
export function normalizeWorkspaceSearchQuery(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) return '';
  const normalized = trimmed.includes('\\')
    ? trimmed.replaceAll('\\', '/')
    : trimmed;
  return normalized.toLowerCase();
}

function escapeRegexChar(char: string): string {
  return /[\\^$+.|()[\]{}]/.test(char) ? `\\${char}` : char;
}

/** 将 glob 转为锚定完整路径的正则（路径已为 `/` 分隔、小写） */
export function globPatternToRegExp(glob: string): RegExp {
  let pattern = '';
  let index = 0;
  while (index < glob.length) {
    const char = glob[index];
    if (char === '*') {
      if (glob[index + 1] === '*') {
        pattern += '.*';
        index += 2;
        if (glob[index] === '/') index += 1;
        continue;
      }
      pattern += '[^/]*';
      index += 1;
      continue;
    }
    if (char === '?') {
      pattern += '[^/]';
      index += 1;
      continue;
    }
    if (char === '[') {
      const close = glob.indexOf(']', index);
      if (close === -1) {
        pattern += '\\[';
        index += 1;
        continue;
      }
      pattern += glob.slice(index, close + 1);
      index = close + 1;
      continue;
    }
    pattern += escapeRegexChar(char);
    index += 1;
  }
  return new RegExp(`^${pattern}$`);
}

function expandBraceAlternates(glob: string): string[] {
  const start = glob.indexOf('{');
  if (start === -1) return [glob];
  const end = glob.indexOf('}', start);
  if (end === -1) return [glob];
  const prefix = glob.slice(0, start);
  const suffix = glob.slice(end + 1);
  const body = glob.slice(start + 1, end);
  return body
    .split(',')
    .flatMap((part) => expandBraceAlternates(`${prefix}${part}${suffix}`));
}

function effectiveGlobPatterns(normalizedPattern: string): string[] {
  const expanded = expandBraceAlternates(normalizedPattern);
  return expanded.map((pattern) =>
    pattern.includes('/') ? pattern : `**/${pattern}`,
  );
}

function pathMatchCandidates(relativePath: string): string[] {
  const normalized = relativePath.replaceAll('\\', '/').toLowerCase();
  if (normalized.endsWith('/')) {
    const withoutSlash = normalized.slice(0, -1);
    return withoutSlash ? [withoutSlash, normalized] : [normalized];
  }
  const basename = normalized.split('/').pop();
  return basename && basename !== normalized
    ? [normalized, basename]
    : [normalized];
}

export function matchWorkspacePath(
  pattern: string,
  relativePath: string,
): boolean {
  const normalizedPattern = normalizeWorkspaceSearchQuery(pattern);
  if (!normalizedPattern) return true;

  const candidates = pathMatchCandidates(relativePath);

  if (!isGlobPattern(normalizedPattern)) {
    return candidates.some((candidate) =>
      candidate.includes(normalizedPattern),
    );
  }

  const patterns = effectiveGlobPatterns(normalizedPattern);
  return patterns.some((globPattern) => {
    const regex = globPatternToRegExp(globPattern);
    return candidates.some((candidate) => regex.test(candidate));
  });
}

function parentDirectoryPath(relativePath: string): string | null {
  const normalized = relativePath.replaceAll('\\', '/');
  const trimmed = normalized.endsWith('/')
    ? normalized.slice(0, -1)
    : normalized;
  const slash = trimmed.lastIndexOf('/');
  if (slash === -1) return null;
  return `${trimmed.slice(0, slash + 1)}`;
}

/** 按子串或 glob 过滤工作区路径，并保留匹配项的祖先目录 */
export function filterWorkspacePathsByQuery(
  paths: readonly string[],
  query: string,
): string[] {
  const normalizedQuery = normalizeWorkspaceSearchQuery(query);
  if (!normalizedQuery) return [...paths];

  const pathSet = new Set(paths);
  const included = new Set<string>();

  for (const relativePath of paths) {
    if (!matchWorkspacePath(normalizedQuery, relativePath)) continue;
    included.add(relativePath);
    let parent = parentDirectoryPath(relativePath);
    while (parent && pathSet.has(parent)) {
      included.add(parent);
      parent = parentDirectoryPath(parent);
    }
  }

  return paths.filter((p) => included.has(p));
}
