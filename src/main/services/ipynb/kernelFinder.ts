import { spawnSync } from 'child_process';
import { createHash } from 'crypto';
import fs from 'fs';
import type { LocalKernelSpec } from '../../../shared/types/ipynbKernel';
import { compressTilde } from '../../../shared/pathUtils';
import { resolveToolExecutable } from '../toolPathService';
import { getShellProcessEnv } from '../../shellPath';

type PythonSource = 'settings' | 'python3' | 'python';

interface PythonCandidate {
  pythonPath: string;
  source: PythonSource;
}

const SOURCE_PRIORITY: Record<PythonSource, number> = {
  settings: 0,
  python3: 1,
  python: 2,
};

function probePython(pythonPath: string): {
  version?: string;
  hasIpython: boolean;
} {
  const env = getShellProcessEnv();
  const versionResult = spawnSync(pythonPath, ['--version'], {
    encoding: 'utf8',
    env,
    timeout: 5000,
  });
  const version = `${versionResult.stdout || versionResult.stderr}`.trim();

  const ipythonResult = spawnSync(
    pythonPath,
    ['-c', 'import IPython; print(IPython.__version__)'],
    { encoding: 'utf8', env, timeout: 8000 },
  );
  const hasIpython = ipythonResult.status === 0;

  return { version, hasIpython };
}

function kernelIdForPath(pythonPath: string): string {
  return createHash('sha256').update(pythonPath).digest('hex').slice(0, 16);
}

function resolveRealPath(pythonPath: string): string | null {
  try {
    return fs.realpathSync(pythonPath);
  } catch {
    return null;
  }
}

function displayNameForPython(
  pythonPath: string,
  version: string | undefined,
  hasIpython: boolean,
): string {
  const ver = version?.replace(/^Python\s+/, '') ?? '?';
  const pathLabel = compressTilde(pythonPath);
  const mode = hasIpython ? 'IPython' : 'stdlib';
  return `Python ${ver} (${mode}) · ${pathLabel}`;
}

function collectCandidates(configuredPython: string): PythonCandidate[] {
  const out: PythonCandidate[] = [];
  const add = (p: string | null | undefined, source: PythonSource) => {
    if (!p) return;
    const norm = p.trim();
    if (!norm) return;
    out.push({ pythonPath: norm, source });
  };

  add(resolveToolExecutable('python', configuredPython), 'settings');
  const env = getShellProcessEnv();
  for (const name of ['python3', 'python'] as const) {
    const checker = process.platform === 'win32' ? 'where' : 'which';
    const result = spawnSync(checker, [name], {
      encoding: 'utf8',
      env,
      timeout: 5000,
    });
    if (result.status === 0) {
      const line = result.stdout
        .toString()
        .trim()
        .split(/\r?\n/)[0]
        ?.trim();
      add(line ?? null, name);
    }
  }
  return out;
}

function dedupeCandidates(candidates: PythonCandidate[]): PythonCandidate[] {
  const byRealPath = new Map<string, PythonCandidate>();
  for (const candidate of candidates) {
    const realPath =
      resolveRealPath(candidate.pythonPath) ?? candidate.pythonPath;
    const existing = byRealPath.get(realPath);
    if (!existing) {
      byRealPath.set(realPath, candidate);
      continue;
    }
    const existingPriority = SOURCE_PRIORITY[existing.source];
    const candidatePriority = SOURCE_PRIORITY[candidate.source];
    if (
      candidatePriority < existingPriority ||
      (candidatePriority === existingPriority &&
        candidate.pythonPath.length < existing.pythonPath.length)
    ) {
      byRealPath.set(realPath, candidate);
    }
  }
  return [...byRealPath.values()];
}

export function listKernelSpecs(configuredPython: string): LocalKernelSpec[] {
  const kernels: LocalKernelSpec[] = [];
  for (const { pythonPath } of dedupeCandidates(
    collectCandidates(configuredPython),
  )) {
    try {
      const probe = probePython(pythonPath);
      kernels.push({
        kind: 'local',
        id: kernelIdForPath(pythonPath),
        displayName: displayNameForPython(
          pythonPath,
          probe.version,
          probe.hasIpython,
        ),
        language: 'python',
        pythonPath,
        version: probe.version,
        hasIpython: probe.hasIpython,
      });
    } catch {
      // skip invalid interpreters
    }
  }
  return kernels;
}

export function findKernelSpecById(
  configuredPython: string,
  specId: string,
): LocalKernelSpec | null {
  return listKernelSpecs(configuredPython).find((k) => k.id === specId) ?? null;
}
