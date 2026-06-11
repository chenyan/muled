import { parseMnoteDocument } from './mnoteFormat';
import { companionMnotePath, isMnotePath } from './mnotePath';
import { normalizeDirectoryPath } from './workspaceTreeFileOps';

export function inferSourcePathFromMnotePath(mnotePath: string): string {
  if (mnotePath.endsWith('.mnote')) {
    return mnotePath.slice(0, -'.mnote'.length);
  }
  return mnotePath;
}

export function updateMnoteDocumentSource(
  content: string,
  newSource: string,
): string {
  const doc = parseMnoteDocument(content);
  if (doc) {
    return content.replace(
      /(^\s*source:\s*)([^\r\n]+)/m,
      `$1${newSource}`,
    );
  }
  return content;
}

export function remapSourcePathForDirectoryMove(
  sourcePath: string,
  fromDir: string,
  toDir: string,
): string {
  const from = normalizeDirectoryPath(fromDir);
  const to = normalizeDirectoryPath(toDir);
  if (from && sourcePath.startsWith(from)) {
    return `${to}${sourcePath.slice(from.length)}`;
  }
  const fromNoSlash = from.replace(/\/$/, '');
  if (fromNoSlash && sourcePath === fromNoSlash) {
    return to.replace(/\/$/, '');
  }
  return sourcePath;
}

/** 源文件重命名/移动时，同步伴生 .mnote 路径与 frontmatter source */
export async function syncCompanionMnoteOnSourceRename(
  from: string,
  to: string,
): Promise<void> {
  if (from.endsWith('/') || to.endsWith('/')) return;

  const fromMnote = companionMnotePath(from);
  const toMnote = companionMnotePath(to);
  const { exists } = await window.muled.workspace.exists(fromMnote);
  if (!exists) return;

  const file = await window.muled.file.read(fromMnote);
  const updated = updateMnoteDocumentSource(file.content, to);
  await window.muled.workspace.rename({ from: fromMnote, to: toMnote });
  await window.muled.file.write(toMnote, updated);
}

/** 目录重命名后，修复该目录下所有 .mnote 的 source 前缀 */
export async function repairMnoteSourcesAfterDirectoryRename(
  fromDir: string,
  toDir: string,
): Promise<void> {
  const from = normalizeDirectoryPath(fromDir);
  const to = normalizeDirectoryPath(toDir);
  const queue: string[] = [to];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const dir = queue.shift()!;
    if (visited.has(dir)) continue;
    visited.add(dir);

    const { paths } = await window.muled.workspace.listChildren(dir);
    for (const path of paths) {
      if (path.endsWith('/')) {
        queue.push(path);
        continue;
      }
      if (!isMnotePath(path)) continue;

      const file = await window.muled.file.read(path);
      const doc = parseMnoteDocument(file.content);
      if (!doc?.source) continue;

      const newSource = remapSourcePathForDirectoryMove(doc.source, from, to);
      if (newSource === doc.source) continue;

      const next = updateMnoteDocumentSource(file.content, newSource);
      await window.muled.file.write(path, next);
    }
  }
}

/** 处理工作区路径重命名（文件或目录） */
export async function handleWorkspacePathRenamed(
  from: string,
  to: string,
): Promise<void> {
  if (from.endsWith('/') && to.endsWith('/')) {
    await repairMnoteSourcesAfterDirectoryRename(from, to);
    return;
  }
  if (!from.endsWith('/') && !to.endsWith('/')) {
    await syncCompanionMnoteOnSourceRename(from, to);
  }
}
