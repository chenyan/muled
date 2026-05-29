import {
  $applyNodeReplacement,
  DecoratorNode,
  type EditorConfig,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from 'lexical';
import InlineMathView from './InlineMathView';

export type SerializedInlineMathNode = Spread<
  { latex: string; type: 'muled-inline-math'; version: 1 },
  SerializedLexicalNode
>;

export class InlineMathNode extends DecoratorNode<JSX.Element> {
  __latex: string;

  static getType(): string {
    return 'muled-inline-math';
  }

  static clone(node: InlineMathNode): InlineMathNode {
    return new InlineMathNode(node.__latex, node.__key);
  }

  constructor(latex: string, key?: NodeKey) {
    super(key);
    this.__latex = latex;
  }

  static importJSON(serializedNode: SerializedInlineMathNode): InlineMathNode {
    return $createInlineMathNode(serializedNode.latex);
  }

  exportJSON(): SerializedInlineMathNode {
    return {
      latex: this.__latex,
      type: 'muled-inline-math',
      version: 1,
    };
  }

  createDOM(_config: EditorConfig): HTMLElement {
    return document.createElement('span');
  }

  updateDOM(): boolean {
    return false;
  }

  getLatex(): string {
    return this.__latex;
  }

  setLatex(latex: string): void {
    const writable = this.getWritable();
    writable.__latex = latex;
  }

  decorate(): JSX.Element {
    return <InlineMathView latex={this.__latex} />;
  }

  isInline(): boolean {
    return true;
  }
}

export function $createInlineMathNode(latex: string): InlineMathNode {
  return $applyNodeReplacement(new InlineMathNode(latex));
}

export function $isInlineMathNode(
  node: LexicalNode | null | undefined,
): node is InlineMathNode {
  return node instanceof InlineMathNode;
}
