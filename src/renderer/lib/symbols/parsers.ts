import { parser as cppParser } from '@lezer/cpp';
import { parser as goParser } from '@lezer/go';
import { parser as javaParser } from '@lezer/java';
import { parser as javascriptParser } from '@lezer/javascript';
import { parser as pythonParser } from '@lezer/python';
import { parser as rustParser } from '@lezer/rust';
import type { Tree } from '@lezer/common';
import type { SourceLanguageId } from '../fileLanguage';
import { parser as schemeParser } from '../scheme/lezer-scheme/parser.js';

const jsTsParser = javascriptParser.configure({ dialect: 'ts' });
const jsxParser = javascriptParser.configure({ dialect: 'jsx' });
const tsxParser = javascriptParser.configure({ dialect: 'jsx ts' });

export function parseSourceTree(
  languageId: SourceLanguageId,
  content: string,
): Tree | null {
  switch (languageId) {
    case 'javascript':
      return javascriptParser.parse(content);
    case 'typescript':
      return jsTsParser.parse(content);
    case 'jsx':
      return jsxParser.parse(content);
    case 'tsx':
      return tsxParser.parse(content);
    case 'python':
      return pythonParser.parse(content);
    case 'rust':
      return rustParser.parse(content);
    case 'go':
      return goParser.parse(content);
    case 'java':
      return javaParser.parse(content);
    case 'cpp':
      return cppParser.parse(content);
    case 'scheme':
      return schemeParser.parse(content);
    default:
      return null;
  }
}

export function supportsSymbolExtraction(languageId: SourceLanguageId): boolean {
  return (
    languageId === 'javascript' ||
    languageId === 'typescript' ||
    languageId === 'jsx' ||
    languageId === 'tsx' ||
    languageId === 'python' ||
    languageId === 'rust' ||
    languageId === 'go' ||
    languageId === 'java' ||
    languageId === 'cpp' ||
    languageId === 'scheme'
  );
}
