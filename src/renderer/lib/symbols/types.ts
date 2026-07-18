export type SymbolKind =
  | 'function'
  | 'class'
  | 'method'
  | 'variable'
  | 'interface'
  | 'type'
  | 'enum'
  | 'struct'
  | 'module'
  | 'property'
  | 'other';

export interface SymbolLocation {
  relativePath: string;
  /** 1-based */
  line: number;
  /** 1-based */
  column: number;
  /** UTF-16 offset in document */
  from: number;
  /** UTF-16 offset in document */
  to: number;
}

export interface SymbolDef extends SymbolLocation {
  name: string;
  kind: SymbolKind;
  /** Outline nesting depth (1 = top-level) */
  depth: number;
  /** Whether this definition belongs in the document outline. */
  outline: boolean;
  /** One-line preview of the definition */
  preview: string;
}

export interface SymbolRef extends SymbolLocation {
  name: string;
}

export interface FileSymbolExtract {
  defs: SymbolDef[];
  refs: SymbolRef[];
}

export type SymbolPickerMode = 'goto-symbol' | 'goto-definition' | 'references';

export interface SymbolPickerOpenOptions {
  mode: SymbolPickerMode;
  /** Pre-filter / prefill query (e.g. current identifier) */
  query?: string;
  /** Prefer definitions from this path when ranking */
  preferPath?: string | null;
}
