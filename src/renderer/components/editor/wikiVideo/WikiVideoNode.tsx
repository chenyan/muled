import {
  $applyNodeReplacement,
  DecoratorNode,
  type EditorConfig,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from 'lexical';
import WikiVideoView from './WikiVideoView';

export type SerializedWikiVideoNode = Spread<
  { src: string; altText: string; type: 'muled-wiki-video'; version: 1 },
  SerializedLexicalNode
>;

export class WikiVideoNode extends DecoratorNode<JSX.Element> {
  __src: string;

  __altText: string;

  static getType(): string {
    return 'muled-wiki-video';
  }

  static clone(node: WikiVideoNode): WikiVideoNode {
    return new WikiVideoNode(node.__src, node.__altText, node.__key);
  }

  constructor(src: string, altText: string, key?: NodeKey) {
    super(key);
    this.__src = src;
    this.__altText = altText;
  }

  static importJSON(serializedNode: SerializedWikiVideoNode): WikiVideoNode {
    return $createWikiVideoNode({
      src: serializedNode.src,
      altText: serializedNode.altText,
    });
  }

  exportJSON(): SerializedWikiVideoNode {
    return {
      src: this.__src,
      altText: this.__altText,
      type: 'muled-wiki-video',
      version: 1,
    };
  }

  createDOM(_config: EditorConfig): HTMLElement {
    return document.createElement('div');
  }

  updateDOM(): boolean {
    return false;
  }

  getSrc(): string {
    return this.__src;
  }

  getAltText(): string {
    return this.__altText;
  }

  decorate(): JSX.Element {
    return <WikiVideoView src={this.__src} altText={this.__altText} />;
  }
}

export function $createWikiVideoNode(params: {
  src: string;
  altText: string;
}): WikiVideoNode {
  return $applyNodeReplacement(
    new WikiVideoNode(params.src, params.altText),
  );
}

export function $isWikiVideoNode(
  node: LexicalNode | null | undefined,
): node is WikiVideoNode {
  return node instanceof WikiVideoNode;
}
