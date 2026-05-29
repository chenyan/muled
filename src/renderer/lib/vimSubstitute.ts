export interface VimSubstituteSpec {
  pattern: string;
  replacement: string;
  flags: string;
}

export type VimSubstituteParseResult =
  | { ok: true; spec: VimSubstituteSpec }
  | { ok: false; error: string };

function unescapeVimToken(value: string): string {
  return value.replace(/\\(.)/g, '$1');
}

function splitDelimitedParts(
  body: string,
  delim: string,
): [string, string, string?] | null {
  const parts: string[] = [];
  let buf = '';
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if (ch === '\\' && i + 1 < body.length) {
      buf += ch + body[i + 1];
      i += 1;
    } else if (ch === delim && parts.length < 2) {
      parts.push(buf);
      buf = '';
    } else {
      buf += ch;
    }
  }
  parts.push(buf);
  if (parts.length < 2) return null;
  return [parts[0]!, parts[1]!, parts[2]];
}

/** 解析 Vim :substitute 子集，如 `s/foo/bar/g`、`:s/foo/bar/g`、`%s/foo/bar/g` */
export function parseVimSubstituteCommand(
  input: string,
): VimSubstituteParseResult {
  let trimmed = input.trim();
  if (trimmed.startsWith(':')) {
    trimmed = trimmed.slice(1).trim();
  }
  if (trimmed.startsWith('%')) {
    trimmed = trimmed.slice(1).trim();
  }
  if (!trimmed.startsWith('s')) {
    return { ok: false, error: '替换命令须以 s 开头，例如 s/foo/bar/g' };
  }

  const delim = trimmed[1];
  if (!delim || /\s/.test(delim)) {
    return { ok: false, error: '缺少分隔符，例如 s/pattern/replacement/flags' };
  }

  const body = trimmed.slice(2);
  const parts = splitDelimitedParts(body, delim);
  if (!parts || parts.length < 2) {
    return {
      ok: false,
      error: '无法解析 pattern/replacement，请检查分隔符与转义',
    };
  }

  const [pattern, replacement, flags = ''] = parts;
  if (!pattern) {
    return { ok: false, error: 'pattern 不能为空' };
  }

  const invalidFlags = [...flags].filter((f) => f !== 'g' && f !== 'i');
  if (invalidFlags.length > 0) {
    return {
      ok: false,
      error: `不支持的 flags: ${invalidFlags.join('')}（v0 仅支持 g、i）`,
    };
  }

  return {
    ok: true,
    spec: {
      pattern: unescapeVimToken(pattern),
      replacement: unescapeVimToken(replacement),
      flags,
    },
  };
}

export function buildSubstituteRegExp(spec: VimSubstituteSpec): RegExp {
  const global = spec.flags.includes('g');
  const ignoreCase = spec.flags.includes('i');
  let flags = '';
  if (global) flags += 'g';
  if (ignoreCase) flags += 'i';
  try {
    return new RegExp(spec.pattern, flags);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    throw new Error(`无效正则: ${message}`);
  }
}

/** 在文本上执行替换；replacement 使用 JS 替换语义（$1、$& 等） */
export function applyVimSubstitute(
  text: string,
  spec: VimSubstituteSpec,
): string {
  const re = buildSubstituteRegExp(spec);
  return text.replace(re, spec.replacement);
}

export function parseCdCommand(
  input: string,
): { ok: true; path: string } | { ok: false; error: string } {
  const trimmed = input.trim();
  if (trimmed === 'cd') {
    return { ok: false, error: '缺少路径，例如 cd ~/projects' };
  }
  if (!trimmed.startsWith('cd ')) {
    return { ok: false, error: '不是 cd 命令' };
  }
  const path = trimmed.slice(3).trim();
  if (!path) {
    return { ok: false, error: '缺少路径，例如 cd ~/projects' };
  }
  return { ok: true, path };
}
