import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  loadRecentWorkspaces,
  loadWorkspaceHistory,
  MAX_RECENT_WORKSPACES,
  recordRecentWorkspace,
  removeWorkspaceFromHistory,
  setRecentWorkspacesFilePathForTests,
  setWorkspacePinned,
} from '../main/services/recentWorkspacesService';

describe('recentWorkspacesService', () => {
  let tempFile: string;

  beforeEach(() => {
    tempFile = path.join(
      fs.mkdtempSync(path.join(os.tmpdir(), 'muled-recent-')),
      'recent-workspaces.json',
    );
    setRecentWorkspacesFilePathForTests(tempFile);
  });

  afterEach(() => {
    setRecentWorkspacesFilePathForTests(null);
    fs.rmSync(path.dirname(tempFile), { recursive: true, force: true });
  });

  it('records paths most-recent-first with dedupe', () => {
    const a = path.join(os.tmpdir(), 'muled-recent-a');
    const b = path.join(os.tmpdir(), 'muled-recent-b');
    recordRecentWorkspace(a);
    recordRecentWorkspace(b);
    recordRecentWorkspace(a);
    expect(loadRecentWorkspaces()).toEqual([
      path.normalize(a),
      path.normalize(b),
    ]);
  });

  it('caps recent list at MAX_RECENT_WORKSPACES', () => {
    for (let index = 0; index < MAX_RECENT_WORKSPACES + 3; index += 1) {
      recordRecentWorkspace(path.join(os.tmpdir(), `muled-recent-${index}`));
    }
    expect(loadWorkspaceHistory().entries.filter((entry) => !entry.pinned))
      .toHaveLength(MAX_RECENT_WORKSPACES);
  });

  it('persists to json file', () => {
    const target = path.join(os.tmpdir(), 'muled-recent-persist');
    recordRecentWorkspace(target);
    expect(fs.existsSync(tempFile)).toBe(true);
    expect(loadRecentWorkspaces()[0]).toBe(path.normalize(target));
  });

  it('migrates legacy array format', () => {
    const legacy = [
      path.join(os.tmpdir(), 'legacy-a'),
      path.join(os.tmpdir(), 'legacy-b'),
    ];
    fs.writeFileSync(tempFile, `${JSON.stringify(legacy)}\n`, 'utf8');
    expect(loadRecentWorkspaces()).toEqual([
      path.normalize(legacy[0]!),
      path.normalize(legacy[1]!),
    ]);
  });

  it('keeps pinned workspaces out of recent limit', () => {
    const pinned = path.join(os.tmpdir(), 'muled-recent-pinned');
    setWorkspacePinned(pinned, true);
    for (let index = 0; index < MAX_RECENT_WORKSPACES + 2; index += 1) {
      recordRecentWorkspace(path.join(os.tmpdir(), `muled-recent-${index}`));
    }
    const history = loadWorkspaceHistory();
    expect(history.entries.filter((entry) => entry.pinned)).toHaveLength(1);
    expect(history.entries.filter((entry) => !entry.pinned)).toHaveLength(
      MAX_RECENT_WORKSPACES,
    );
    expect(history.pickerPaths[0]).toBe(path.normalize(pinned));
  });

  it('does not add pinned workspace to recent when switching to it', () => {
    const pinned = path.join(os.tmpdir(), 'muled-recent-pinned-active');
    setWorkspacePinned(pinned, true);
    recordRecentWorkspace(pinned);
    const history = loadWorkspaceHistory();
    expect(history.entries).toEqual([
      { path: path.normalize(pinned), pinned: true },
    ]);
  });

  it('removes workspace from history', () => {
    const target = path.join(os.tmpdir(), 'muled-recent-remove');
    recordRecentWorkspace(target);
    const result = removeWorkspaceFromHistory(target);
    expect(result.entries).toEqual([]);
    expect(loadRecentWorkspaces()).toEqual([]);
  });

  it('unpins workspace into recent list', () => {
    const target = path.join(os.tmpdir(), 'muled-recent-unpin');
    setWorkspacePinned(target, true);
    const result = setWorkspacePinned(target, false);
    expect(result.entries).toEqual([
      { path: path.normalize(target), pinned: false },
    ]);
  });
});
