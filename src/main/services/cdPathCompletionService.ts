import fs from 'fs';
import os from 'os';
import path from 'path';
import { formatWorkspacePathLabel } from '../../shared/formatWorkspacePathLabel';
import { expandTilde, resolvePath } from '../../shared/pathUtils';

function listDirectoryCandidates(
  browseDir: string,
  namePrefix: string,
): string[] {
  if (!fs.existsSync(browseDir)) {
    return [];
  }
  let stat: fs.Stats;
  try {
    stat = fs.statSync(browseDir);
  } catch {
    return [];
  }
  if (!stat.isDirectory()) {
    return [];
  }

  const prefixLower = namePrefix.toLowerCase();
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(browseDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const results: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) {
      continue;
    }
    if (
      namePrefix &&
      !entry.name.toLowerCase().startsWith(prefixLower)
    ) {
      continue;
    }
    results.push(path.join(browseDir, entry.name));
  }
  return results.sort();
}

function resolveBrowseTarget(partial: string): {
  browseDir: string;
  namePrefix: string;
} {
  const trimmed = partial.trim();
  if (!trimmed || trimmed === '~') {
    return { browseDir: os.homedir(), namePrefix: '' };
  }

  const expanded = expandTilde(trimmed);
  if (trimmed.endsWith('/') || trimmed.endsWith('\\')) {
    return {
      browseDir: resolvePath(trimmed),
      namePrefix: '',
    };
  }

  const absolutePartial = path.isAbsolute(expanded)
    ? path.normalize(expanded)
    : path.normalize(path.resolve(process.cwd(), expanded));

  const namePrefix = path.basename(absolutePartial);
  let browseDir = path.dirname(absolutePartial);

  if (fs.existsSync(absolutePartial)) {
    const stat = fs.statSync(absolutePartial);
    if (stat.isDirectory()) {
      return { browseDir: absolutePartial, namePrefix: '' };
    }
  }

  if (!fs.existsSync(browseDir)) {
    const parent = path.dirname(browseDir);
    if (fs.existsSync(parent) && fs.statSync(parent).isDirectory()) {
      browseDir = parent;
    }
  }

  return { browseDir, namePrefix };
}

function labelMatchesPartial(label: string, partial: string): boolean {
  if (!partial) {
    return label.length > 0;
  }
  return label.toLowerCase().startsWith(partial.toLowerCase());
}

/** `cd` 命令路径补全候选（展示用 label，如 ~/projects） */
export function listCdPathCompletionLabels(
  partial: string,
  recentWorkspaces: readonly string[],
): string[] {
  const homeDir = os.homedir();
  const partialTrimmed = partial.trim();
  const seen = new Set<string>();
  const labels: string[] = [];

  const pushAbsolute = (absolutePath: string) => {
    const label = formatWorkspacePathLabel(
      path.normalize(absolutePath),
      homeDir,
    );
    if (seen.has(label)) {
      return;
    }
    if (!labelMatchesPartial(label, partialTrimmed)) {
      return;
    }
    seen.add(label);
    labels.push(label);
  };

  for (const workspacePath of recentWorkspaces) {
    pushAbsolute(resolvePath(workspacePath));
  }

  const { browseDir, namePrefix } = resolveBrowseTarget(partialTrimmed);
  for (const absolutePath of listDirectoryCandidates(browseDir, namePrefix)) {
    pushAbsolute(absolutePath);
  }

  return labels.sort((a, b) => a.localeCompare(b));
}
