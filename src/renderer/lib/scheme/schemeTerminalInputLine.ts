import type { TerminalCore } from '@wterm/core';

export const SCHEME_TERMINAL_PROMPT_RE = /^>+\s/;

export interface SchemeTerminalInputLine {
  promptLen: number;
  input: string;
  cursorCol: number;
}

export function readTerminalRowText(
  bridge: TerminalCore,
  row: number,
  cols: number,
): string {
  let text = '';
  for (let col = 0; col < cols; col += 1) {
    const cell = bridge.getCell(row, col);
    const cp = cell.char;
    if (cp >= 32) {
      text += String.fromCodePoint(cp);
    }
  }
  return text;
}

export function parseSchemeTerminalInputLine(
  lineText: string,
  cursorCol: number,
): SchemeTerminalInputLine | null {
  const match = lineText.match(SCHEME_TERMINAL_PROMPT_RE);
  if (!match) return null;
  const promptLen = match[0].length;
  return {
    promptLen,
    input: lineText.slice(promptLen).replace(/\s+$/, ''),
    cursorCol: Math.max(promptLen, Math.min(cursorCol, lineText.length)),
  };
}

export function getTerminalGridRowElement(
  terminalElement: HTMLElement,
  scrollbackCount: number,
  row: number,
): HTMLElement | null {
  const grid = terminalElement.querySelector('.term-grid');
  if (!grid) return null;
  const rowEl = grid.children[scrollbackCount + row];
  return rowEl instanceof HTMLElement ? rowEl : null;
}

/** 提取光标前的 Scheme 标识符前缀（用于 Tab 补全） */
export function extractSchemeCompletionPrefix(
  input: string,
  cursorColInLine: number,
): { prefix: string; startCol: number } {
  const before = input.slice(0, Math.max(0, cursorColInLine)).replace(/\s+$/, '');
  const match = before.match(/([^\s()[\]{}"'`;,|\x23\x40]+)$/);
  if (!match || !/[a-zA-Z]/.test(match[1])) {
    return { prefix: '', startCol: cursorColInLine };
  }
  return {
    prefix: match[1],
    startCol: before.length - match[1].length,
  };
}
