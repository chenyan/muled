import {
  $applyNodeReplacement,
  DecoratorNode,
  type EditorConfig,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from 'lexical';
import HtmlView from './HtmlView';

export type SerializedHtmlNode = Spread<
  { html: string; block: boolean; type: 'muled-html'; version: 1 },
  SerializedLexicalNode
>;

export class HtmlNode extends DecoratorNode<JSX.Element> {
  __html: string;

  __block: boolean;

  static getType(): string {
    return 'muled-html';
  }

  static clone(node: HtmlNode): HtmlNode {
    return new HtmlNode(node.__html, node.__block, node.__key);
  }

  constructor(html: string, block: boolean, key?: NodeKey) {
    super(key);
    this.__html = html;
    this.__block = block;
  }

  static importJSON(serializedNode: SerializedHtmlNode): HtmlNode {
    return $createHtmlNode(serializedNode.html, serializedNode.block);
  }

  exportJSON(): SerializedHtmlNode {
    return {
      html: this.__html,
      block: this.__block,
      type: 'muled-html',
      version: 1,
    };
  }

  createDOM(_config: EditorConfig): HTMLElement {
    return document.createElement(this.__block ? 'div' : 'span');
  }

  updateDOM(): boolean {
    return false;
  }

  getHtml(): string {
    return this.__html;
  }

  isBlock(): boolean {
    return this.__block;
  }

  decorate(): JSX.Element {
    return <HtmlView html={this.__html} block={this.__block} />;
  }

  isInline(): boolean {
    return !this.__block;
  }
}

export function $createHtmlNode(html: string, block: boolean): HtmlNode {
  return $applyNodeReplacement(new HtmlNode(html, block));
}

export function $isHtmlNode(
  node: LexicalNode | null | undefined,
): node is HtmlNode {
  return node instanceof HtmlNode;
}
