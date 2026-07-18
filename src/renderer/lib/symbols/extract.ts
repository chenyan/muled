import type { SourceLanguageId } from '../fileLanguage';
import { parseSourceTree, supportsSymbolExtraction } from './parsers';
import { extractCppSymbols } from './extractors/cpp';
import { extractGoSymbols } from './extractors/go';
import { extractJavaSymbols } from './extractors/java';
import { extractJavascriptSymbols } from './extractors/javascript';
import { extractPythonSymbols } from './extractors/python';
import { extractRustSymbols } from './extractors/rust';
import { extractSchemeSymbols } from './extractors/scheme';
import type { FileSymbolExtract } from './types';

const EMPTY: FileSymbolExtract = { defs: [], refs: [] };

export function extractFileSymbols(
  languageId: SourceLanguageId,
  content: string,
  relativePath: string,
): FileSymbolExtract {
  if (!supportsSymbolExtraction(languageId)) {
    return EMPTY;
  }
  const tree = parseSourceTree(languageId, content);
  if (!tree) return EMPTY;
  const top = tree.topNode;

  switch (languageId) {
    case 'javascript':
    case 'typescript':
    case 'jsx':
    case 'tsx':
      return extractJavascriptSymbols(top, content, relativePath);
    case 'python':
      return extractPythonSymbols(top, content, relativePath);
    case 'rust':
      return extractRustSymbols(top, content, relativePath);
    case 'go':
      return extractGoSymbols(top, content, relativePath);
    case 'java':
      return extractJavaSymbols(top, content, relativePath);
    case 'cpp':
      return extractCppSymbols(top, content, relativePath);
    case 'scheme':
      return extractSchemeSymbols(top, content, relativePath);
    default:
      return EMPTY;
  }
}

export { supportsSymbolExtraction };
