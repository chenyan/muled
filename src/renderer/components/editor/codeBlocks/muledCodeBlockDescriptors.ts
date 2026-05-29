import type { CodeBlockEditorDescriptor } from '@mdxeditor/editor';
import MathCodeBlockEditor from './MathCodeBlockEditor';
import MermaidCodeBlockEditor from './MermaidCodeBlockEditor';
import PlainCodeBlockEditor from './PlainCodeBlockEditor';

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

const MULED_CODE_BLOCK_DESCRIPTORS: CodeBlockEditorDescriptor[] = [
  MERMAID_DESCRIPTOR,
  MATH_DESCRIPTOR,
  PLAIN_FALLBACK_DESCRIPTOR,
];

export default MULED_CODE_BLOCK_DESCRIPTORS;
