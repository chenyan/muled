import fs from 'fs';
import os from 'os';
import path from 'path';
import ConfigService from '../main/services/configService';
import WorkspaceService from '../main/services/workspaceService';

describe('WorkspaceService', () => {
  let tmpRoot: string;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'muled-ws-'));
    fs.mkdirSync(path.join(tmpRoot, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tmpRoot, 'README.md'), '# hi');
    fs.writeFileSync(path.join(tmpRoot, 'src', 'index.ts'), 'export {}');
    fs.mkdirSync(path.join(tmpRoot, 'node_modules'), { recursive: true });
    fs.writeFileSync(path.join(tmpRoot, 'node_modules', 'ignored.js'), 'skip');
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('lists files with trailing slash on directories and skips node_modules', () => {
    const config = new ConfigService();
    config.load();
    const workspace = new WorkspaceService(config);
    workspace.setRoot(tmpRoot);
    const paths = workspace.listPaths();
    expect(paths).toContain('README.md');
    expect(paths).toContain('src/');
    expect(paths).toContain('src/index.ts');
    expect(paths.some((p) => p.includes('node_modules'))).toBe(false);
  });

  it('lists only direct children for a directory', () => {
    const config = new ConfigService();
    config.load();
    const workspace = new WorkspaceService(config);
    workspace.setRoot(tmpRoot);

    expect(workspace.listChildren('')).toEqual(['README.md', 'src/']);
    expect(workspace.listChildren('src/')).toEqual(['src/index.ts']);
  });

  it('normalizes directory input and blocks escape paths', () => {
    const config = new ConfigService();
    config.load();
    const workspace = new WorkspaceService(config);
    workspace.setRoot(tmpRoot);

    expect(workspace.listChildren('src')).toEqual(['src/index.ts']);
    expect(() => workspace.listChildren('../')).toThrow('Path escapes workspace');
  });
});
