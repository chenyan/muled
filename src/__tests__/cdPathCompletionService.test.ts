import fs from 'fs';
import os from 'os';
import path from 'path';
import { listCdPathCompletionLabels } from '../main/services/cdPathCompletionService';

describe('listCdPathCompletionLabels', () => {
  let tmpRoot: string;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'muled-cd-complete-'));
    fs.mkdirSync(path.join(tmpRoot, 'alpha'), { recursive: true });
    fs.mkdirSync(path.join(tmpRoot, 'beta'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('lists child directories matching prefix', () => {
    const labels = listCdPathCompletionLabels(`${tmpRoot}/a`, []);
    expect(labels).toContain(`${tmpRoot}/alpha`);
  });

  it('includes recent workspaces that match partial', () => {
    const labels = listCdPathCompletionLabels('', [tmpRoot]);
    expect(labels).toContain(tmpRoot.replace(/\\/g, '/'));
  });
});
