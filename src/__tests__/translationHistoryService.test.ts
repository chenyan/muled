import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  appendTranslationHistoryEntry,
  ensureTranslationHistoryFile,
  setTranslationHistoryFilePathForTests,
} from '../main/services/translationHistoryService';

describe('translationHistoryService', () => {
  let tempFile: string;

  beforeEach(() => {
    tempFile = path.join(
      os.tmpdir(),
      `muled-translation-history-${Date.now()}-${Math.random()}.md`,
    );
    setTranslationHistoryFilePathForTests(tempFile);
  });

  afterEach(() => {
    setTranslationHistoryFilePathForTests(null);
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  });

  it('creates history file with header', () => {
    ensureTranslationHistoryFile();
    expect(fs.readFileSync(tempFile, 'utf8')).toBe('# 翻译历史\n\n');
  });

  it('appends translation entries', () => {
    appendTranslationHistoryEntry('Hello world', '你好，世界');
    const content = fs.readFileSync(tempFile, 'utf8');
    expect(content).toContain('# 翻译历史');
    expect(content).toContain('**原文**');
    expect(content).toContain('> Hello world');
    expect(content).toContain('**译文**');
    expect(content).toContain('你好，世界');
    expect(content).toContain('---');
  });
});
