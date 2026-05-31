import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { ACME_PALETTE as P } from '../../shared/acmePalette';

const acmeTheme = EditorView.theme(
  {
    '&': {
      color: P.fg,
      backgroundColor: P.bg,
    },
    '.cm-content': {
      caretColor: P.fg,
    },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: P.fg },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection':
      { backgroundColor: P.selection },
    '.cm-panels': { backgroundColor: P.header, color: P.fg },
    '.cm-panels.cm-panels-top': { borderBottom: `1px solid ${P.border}` },
    '.cm-panels.cm-panels-bottom': { borderTop: `1px solid ${P.border}` },
    '.cm-searchMatch': {
      backgroundColor: P.highlight,
      outline: `1px solid ${P.border}`,
    },
    '.cm-searchMatch.cm-searchMatch-selected': {
      backgroundColor: P.selection,
    },
    '.cm-activeLine': { backgroundColor: `${P.selection}66` },
    '.cm-selectionMatch': { backgroundColor: P.highlight },
    '&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket': {
      outline: `1px solid ${P.border}`,
    },
    '&.cm-focused .cm-matchingBracket': {
      backgroundColor: P.highlight,
    },
    '.cm-gutters': {
      borderRight: `1px solid ${P.border}`,
      color: P.muted,
      backgroundColor: P.scrollbarGutter,
    },
    '.cm-activeLineGutter': {
      backgroundColor: `${P.selection}66`,
    },
    '.cm-foldPlaceholder': {
      backgroundColor: 'transparent',
      border: 'none',
      color: P.muted,
    },
    '.cm-tooltip': {
      border: `1px solid ${P.border}`,
      backgroundColor: P.header,
    },
    '.cm-tooltip .cm-tooltip-arrow:before': {
      borderTopColor: 'transparent',
      borderBottomColor: 'transparent',
    },
    '.cm-tooltip .cm-tooltip-arrow:after': {
      borderTopColor: P.header,
      borderBottomColor: P.header,
    },
    '.cm-tooltip-autocomplete': {
      '& > ul > li[aria-selected]': {
        backgroundColor: P.highlight,
        color: P.fg,
      },
    },
  },
  { dark: false },
);

const acmeHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: '#000080', fontWeight: 'bold' },
  { tag: tags.string, color: '#006400' },
  { tag: tags.comment, color: '#666666', fontStyle: 'italic' },
  { tag: tags.number, color: '#800080' },
  { tag: tags.operator, color: P.fg },
  { tag: tags.variableName, color: P.fg },
  { tag: tags.typeName, color: '#000080' },
  { tag: tags.tagName, color: '#000080' },
  { tag: tags.attributeName, color: '#800000' },
  { tag: tags.link, color: P.link, textDecoration: 'underline' },
  { tag: tags.heading, fontWeight: 'bold', color: P.fg },
  { tag: tags.strong, fontWeight: 'bold' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.monospace, color: P.fg },
]);

export const acmeCodeMirrorTheme = [
  acmeTheme,
  syntaxHighlighting(acmeHighlightStyle),
];
