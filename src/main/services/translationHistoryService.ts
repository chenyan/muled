import fs from 'fs';
import {
  ensureParentDir,
  getTranslationHistoryFilePath,
} from '../../shared/pathUtils';

const HISTORY_HEADER = '# 翻译历史\n\n';

let translationHistoryFilePathOverride: string | null = null;

/** 仅用于单元测试：指向临时文件，避免读写真实配置 */
export function setTranslationHistoryFilePathForTests(
  filePath: string | null,
): void {
  translationHistoryFilePathOverride = filePath;
}

function translationHistoryFilePath(): string {
  return translationHistoryFilePathOverride ?? getTranslationHistoryFilePath();
}

function formatTimestamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function formatOriginalBlock(sentence: string): string {
  if (sentence.includes('\n')) {
    return sentence;
  }
  return `> ${sentence}`;
}

function formatEntry(sentence: string, translation: string, date = new Date()): string {
  return [
    `## ${formatTimestamp(date)}`,
    '',
    '**原文**',
    '',
    formatOriginalBlock(sentence),
    '',
    '**译文**',
    '',
    translation,
    '',
    '---',
    '',
  ].join('\n');
}

export function ensureTranslationHistoryFile(): void {
  const filePath = translationHistoryFilePath();
  if (fs.existsSync(filePath)) {
    return;
  }
  ensureParentDir(filePath);
  fs.writeFileSync(filePath, HISTORY_HEADER, 'utf8');
}

export function appendTranslationHistoryEntry(
  sentence: string,
  translation: string,
): void {
  const trimmedSentence = sentence.trim();
  const trimmedTranslation = translation.trim();
  if (!trimmedSentence || !trimmedTranslation) {
    return;
  }

  ensureTranslationHistoryFile();
  const filePath = translationHistoryFilePath();
  fs.appendFileSync(
    filePath,
    formatEntry(trimmedSentence, trimmedTranslation),
    'utf8',
  );
}
