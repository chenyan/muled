import type { CodeBlockEditorDescriptor } from '@mdxeditor/editor';
import MathCodeBlockEditor from './MathCodeBlockEditor';
import MermaidCodeBlockEditor from './MermaidCodeBlockEditor';
import MnoteEntryCodeBlockEditor from './MnoteEntryCodeBlockEditor';
import PlainCodeBlockEditor from './PlainCodeBlockEditor';
import StrudelCodeBlockEditor from './StrudelCodeBlockEditor';

const MERMAID_DESCRIPTOR: CodeBlockEditorDescriptor = {
  priority: 100,
  match: (language) => language === 'mermaid',
  Editor: MermaidCodeBlockEditor,
};

const MATH_LANGUAGES = new Set(['math', 'latex', 'tex', 'katex']);

const MATH_DESCRIPTOR: CodeBlockEditorDescriptor = {
  priority: 100,
  match: (language) => MATH_LANGUAGES.has((language ?? '').toLowerCase()),
  Editor: MathCodeBlockEditor,
};

/** 覆盖 MDXEditor 默认 codeMirrorPlugin（priority 1），避免 useCodeMirrorRef 在节点已卸载时抛错 */
const PLAIN_FALLBACK_DESCRIPTOR: CodeBlockEditorDescriptor = {
  priority: 10,
  match: () => true,
  Editor: PlainCodeBlockEditor,
};

const MNOTE_ENTRY_DESCRIPTOR: CodeBlockEditorDescriptor = {
  priority: 110,
  match: (language) => language === 'mnote-entry',
  Editor: MnoteEntryCodeBlockEditor,
};

const STRUDEL_DESCRIPTOR: CodeBlockEditorDescriptor = {
  priority: 100,
  match: (language) => language === 'strudel',
  Editor: StrudelCodeBlockEditor,
};

const MULED_CODE_BLOCK_DESCRIPTORS: CodeBlockEditorDescriptor[] = [
  MNOTE_ENTRY_DESCRIPTOR,
  STRUDEL_DESCRIPTOR,
  MERMAID_DESCRIPTOR,
  MATH_DESCRIPTOR,
  PLAIN_FALLBACK_DESCRIPTOR,
];

const MULED_MNOTE_CODE_BLOCK_DESCRIPTORS: CodeBlockEditorDescriptor[] = [
  MNOTE_ENTRY_DESCRIPTOR,
  PLAIN_FALLBACK_DESCRIPTOR,
];

export { MULED_MNOTE_CODE_BLOCK_DESCRIPTORS };
export default MULED_CODE_BLOCK_DESCRIPTORS;
