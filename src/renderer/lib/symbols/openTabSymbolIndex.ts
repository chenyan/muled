import type { SourceLanguageId } from '../fileLanguage';
import { extractFileSymbols } from './extract';
import type { FileSymbolExtract, SymbolDef, SymbolRef } from './types';

export interface SymbolIndexTabInput {
  tabId: string;
  relativePath: string | null;
  content: string;
  languageId: SourceLanguageId;
}

interface IndexedFile {
  tabId: string;
  relativePath: string;
  languageId: SourceLanguageId;
  contentHash: string;
  extract: FileSymbolExtract;
}

function simpleHash(content: string): string {
  let h = 2166136261;
  for (let i = 0; i < content.length; i += 1) {
    h ^= content.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `${content.length}:${h >>> 0}`;
}

function rankDef(
  def: SymbolDef,
  preferPath: string | null | undefined,
): number {
  if (preferPath && def.relativePath === preferPath) return 0;
  return 1;
}

export class OpenTabSymbolIndex {
  private byTabId = new Map<string, IndexedFile>();

  private byPath = new Map<string, IndexedFile>();

  syncTabs(tabs: readonly SymbolIndexTabInput[]): void {
    const keep = new Set<string>();
    for (const tab of tabs) {
      if (!tab.relativePath) continue;
      keep.add(tab.tabId);
      const hash = simpleHash(tab.content);
      const existing = this.byTabId.get(tab.tabId);
      if (
        existing &&
        existing.contentHash === hash &&
        existing.languageId === tab.languageId &&
        existing.relativePath === tab.relativePath
      ) {
        continue;
      }
      const extract = extractFileSymbols(
        tab.languageId,
        tab.content,
        tab.relativePath,
      );
      const indexed: IndexedFile = {
        tabId: tab.tabId,
        relativePath: tab.relativePath,
        languageId: tab.languageId,
        contentHash: hash,
        extract,
      };
      this.byTabId.set(tab.tabId, indexed);
      this.byPath.set(tab.relativePath, indexed);
    }

    for (const tabId of [...this.byTabId.keys()]) {
      if (keep.has(tabId)) continue;
      const removed = this.byTabId.get(tabId);
      this.byTabId.delete(tabId);
      if (removed && this.byPath.get(removed.relativePath)?.tabId === tabId) {
        this.byPath.delete(removed.relativePath);
      }
    }
  }

  clear(): void {
    this.byTabId.clear();
    this.byPath.clear();
  }

  getAllDefinitions(): SymbolDef[] {
    const defs: SymbolDef[] = [];
    for (const file of this.byTabId.values()) {
      defs.push(...file.extract.defs);
    }
    return defs;
  }

  findDefinitions(
    name: string,
    preferPath?: string | null,
  ): SymbolDef[] {
    if (!name) return [];
    const matches: SymbolDef[] = [];
    for (const file of this.byTabId.values()) {
      for (const def of file.extract.defs) {
        if (def.name === name) matches.push(def);
      }
    }
    return matches.sort((a, b) => {
      const rank = rankDef(a, preferPath) - rankDef(b, preferPath);
      if (rank !== 0) return rank;
      if (a.relativePath !== b.relativePath) {
        return a.relativePath.localeCompare(b.relativePath);
      }
      return a.line - b.line;
    });
  }

  findReferences(name: string): SymbolRef[] {
    if (!name) return [];
    const matches: SymbolRef[] = [];
    for (const file of this.byTabId.values()) {
      for (const ref of file.extract.refs) {
        if (ref.name === name) matches.push(ref);
      }
    }
    return matches.sort((a, b) => {
      if (a.relativePath !== b.relativePath) {
        return a.relativePath.localeCompare(b.relativePath);
      }
      return a.line - b.line;
    });
  }

  filterDefinitions(query: string): SymbolDef[] {
    const q = query.trim().toLowerCase();
    const defs = this.getAllDefinitions();
    if (!q) return defs;
    return defs.filter((def) => def.name.toLowerCase().includes(q));
  }

  getFileExtract(relativePath: string): FileSymbolExtract | null {
    return this.byPath.get(relativePath)?.extract ?? null;
  }
}

/** Shared renderer singleton for open-tab symbol navigation. */
export const openTabSymbolIndex = new OpenTabSymbolIndex();
