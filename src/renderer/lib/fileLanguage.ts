/** CodeMirror 全文 Source 语言标识 */
export type SourceLanguageId =
  | 'markdown'
  | 'javascript'
  | 'typescript'
  | 'jsx'
  | 'tsx'
  | 'json'
  | 'yaml'
  | 'html'
  | 'css'
  | 'sass'
  | 'less'
  | 'python'
  | 'rust'
  | 'go'
  | 'java'
  | 'sql'
  | 'xml'
  | 'php'
  | 'cpp'
  | 'vue'
  | 'latex'
  | 'org'
  | 'scheme'
  | 'scala'
  | 'plain';

const EXT_TO_LANGUAGE: Record<string, SourceLanguageId> = {
  md: 'markdown',
  mdx: 'markdown',
  markdown: 'markdown',
  mnote: 'markdown',
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ts: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  jsx: 'jsx',
  tsx: 'tsx',
  json: 'json',
  jsonc: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  html: 'html',
  htm: 'html',
  xhtml: 'html',
  css: 'css',
  scss: 'sass',
  sass: 'sass',
  less: 'less',
  py: 'python',
  rs: 'rust',
  go: 'go',
  java: 'java',
  sql: 'sql',
  xml: 'xml',
  svg: 'xml',
  php: 'php',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  h: 'cpp',
  hpp: 'cpp',
  vue: 'vue',
  tex: 'latex',
  ltx: 'latex',
  sty: 'latex',
  cls: 'latex',
  dtx: 'latex',
  org: 'org',
  scm: 'scheme',
  ss: 'scheme',
  sch: 'scheme',
  rkt: 'scheme',
  scala: 'scala',
  sc: 'scala',
  csv: 'plain',
  ipynb: 'json',
  strudel: 'javascript',
  p5: 'javascript',
};

const LANGUAGE_LABELS: Record<SourceLanguageId, string> = {
  markdown: 'Markdown',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  jsx: 'JSX',
  tsx: 'TSX',
  json: 'JSON',
  yaml: 'YAML',
  html: 'HTML',
  css: 'CSS',
  sass: 'SCSS',
  less: 'Less',
  python: 'Python',
  rust: 'Rust',
  go: 'Go',
  java: 'Java',
  sql: 'SQL',
  xml: 'XML',
  php: 'PHP',
  cpp: 'C++',
  vue: 'Vue',
  latex: 'LaTeX',
  org: 'Org Mode',
  scheme: 'Scheme',
  scala: 'Scala',
  plain: 'Plain Text',
};

export function isMarkdownPath(relativePath: string | null): boolean {
  if (!relativePath) return true;
  const base = relativePath.replace(/\/$/, '');
  return /\.(md|mdx|markdown)$/i.test(base);
}

export function isHtmlPath(relativePath: string | null): boolean {
  if (!relativePath) return false;
  const base = relativePath.replace(/\/$/, '');
  return /\.(x?html|htm)$/i.test(base);
}

export function isOrgPath(relativePath: string | null): boolean {
  if (!relativePath) return false;
  const base = relativePath.replace(/\/$/, '');
  return /\.org$/i.test(base);
}

export function isStrudelPath(relativePath: string | null): boolean {
  if (!relativePath) return false;
  const base = relativePath.replace(/\/$/, '');
  return /\.strudel$/i.test(base);
}

export function isP5Path(relativePath: string | null): boolean {
  if (!relativePath) return false;
  const base = relativePath.replace(/\/$/, '');
  return /\.p5$/i.test(base);
}

export function getSourceLanguageId(
  relativePath: string | null,
): SourceLanguageId {
  if (!relativePath) return 'markdown';
  const base = relativePath.replace(/\/$/, '');
  const dot = base.lastIndexOf('.');
  if (dot < 0) return 'plain';
  const ext = base.slice(dot + 1).toLowerCase();
  return EXT_TO_LANGUAGE[ext] ?? 'plain';
}

export function getSourceLanguageLabel(id: SourceLanguageId): string {
  return LANGUAGE_LABELS[id];
}

const CODE_BLOCK_LANG: Record<string, SourceLanguageId> = {
  txt: 'plain',
  text: 'plain',
  plain: 'plain',
  md: 'markdown',
  markdown: 'markdown',
  js: 'javascript',
  javascript: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ts: 'typescript',
  typescript: 'typescript',
  jsx: 'jsx',
  tsx: 'tsx',
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  html: 'html',
  htm: 'html',
  xhtml: 'html',
  css: 'css',
  scss: 'sass',
  sass: 'sass',
  less: 'less',
  py: 'python',
  python: 'python',
  rs: 'rust',
  rust: 'rust',
  go: 'go',
  java: 'java',
  sql: 'sql',
  xml: 'xml',
  svg: 'xml',
  php: 'php',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  c: 'cpp',
  h: 'cpp',
  hpp: 'cpp',
  vue: 'vue',
  tex: 'latex',
  latex: 'latex',
  ltx: 'latex',
  sty: 'latex',
  org: 'org',
  'org-mode': 'org',
  scm: 'scheme',
  scheme: 'scheme',
  ss: 'scheme',
  rkt: 'scheme',
  scala: 'scala',
  sc: 'scala',
};

export function codeBlockLanguageId(language: string): SourceLanguageId {
  const key = language.trim().toLowerCase();
  return CODE_BLOCK_LANG[key] ?? 'plain';
}

export function codeBlockLanguageLabel(language: string): string {
  const key = language.trim().toLowerCase();
  if (key === 'strudel') {
    return 'Strudel';
  }
  return getSourceLanguageLabel(codeBlockLanguageId(language));
}
