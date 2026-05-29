import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  loadRecentWorkspaces,
  MAX_RECENT_WORKSPACES,
  recordRecentWorkspace,
  setRecentWorkspacesFilePathForTests,
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

  it('caps list at MAX_RECENT_WORKSPACES', () => {
    for (let index = 0; index < MAX_RECENT_WORKSPACES + 3; index += 1) {
      recordRecentWorkspace(path.join(os.tmpdir(), `muled-recent-${index}`));
    }
    expect(loadRecentWorkspaces()).toHaveLength(MAX_RECENT_WORKSPACES);
  });

  it('persists to json file', () => {
    const target = path.join(os.tmpdir(), 'muled-recent-persist');
    recordRecentWorkspace(target);
    expect(fs.existsSync(tempFile)).toBe(true);
    expect(loadRecentWorkspaces()[0]).toBe(path.normalize(target));
  });
});
