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

  it('creates files and directories under the workspace root', () => {
    const config = new ConfigService();
    config.load();
    const workspace = new WorkspaceService(config);
    workspace.setRoot(tmpRoot);

    expect(workspace.createFile('notes.md')).toBe('notes.md');
    expect(workspace.createDirectory('assets/')).toBe('assets/');
    expect(fs.existsSync(path.join(tmpRoot, 'notes.md'))).toBe(true);
    expect(fs.statSync(path.join(tmpRoot, 'assets')).isDirectory()).toBe(true);
    expect(workspace.pathExists('notes.md')).toBe(true);
  });

  it('creates nested entries and renames them', () => {
    const config = new ConfigService();
    config.load();
    const workspace = new WorkspaceService(config);
    workspace.setRoot(tmpRoot);

    expect(workspace.createDirectory('drafts/')).toBe('drafts/');
    expect(workspace.createFile('drafts/note.md')).toBe('drafts/note.md');
    expect(workspace.renamePath('drafts/note.md', 'drafts/final.md')).toBe(
      'drafts/final.md',
    );
    expect(fs.existsSync(path.join(tmpRoot, 'drafts/final.md'))).toBe(true);
    expect(workspace.renamePath('drafts/', 'published/')).toBe('published/');
    expect(fs.existsSync(path.join(tmpRoot, 'published/final.md'))).toBe(true);
  });

  it('deletes empty files and directories', () => {
    const config = new ConfigService();
    config.load();
    const workspace = new WorkspaceService(config);
    workspace.setRoot(tmpRoot);

    workspace.createFile('temp.md');
    workspace.createDirectory('scratch/');
    workspace.deletePath('temp.md');
    workspace.deletePath('scratch/');
    expect(workspace.pathExists('temp.md')).toBe(false);
    expect(workspace.pathExists('scratch/')).toBe(false);
  });
});
