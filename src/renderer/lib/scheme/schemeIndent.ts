import {
  delimitedIndent,
  indentNodeProp,
  type TreeIndentContext,
} from '@codemirror/language';
import type { SyntaxNode } from '@lezer/common';
import { isCollNodeName, SCHEME_COLL_DELIMS } from './schemeCollNodes';
import { expressionChildren, symbolText } from './sexpOps';

const DEFINE_FORMS = new Set([
  'define',
  'defun',
  'define-syntax',
  'define-values',
  'define-record-type',
]);

const BINDING_FORMS = new Set(['let', 'let*', 'letrec', 'let-values', 'letrec-values']);

const BODY_HEAD_FORMS = new Set([
  'begin',
  'lambda',
  'case-lambda',
  'cond',
  'case',
  'if',
  'when',
  'unless',
  'do',
  'parameterize',
]);

function closingPattern(close: string): RegExp {
  const escaped =
    close === ')' ? '\\)' : close.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^\\s*${escaped}`);
}

function listHeadSymbol(node: SyntaxNode, doc: string): string | null {
  const children = expressionChildren(node);
  const head = children[0];
  return head?.name === 'Symbol' ? symbolText(head, doc) : null;
}

function lineNumberAt(state: TreeIndentContext['state'], pos: number): number {
  return state.doc.lineAt(pos).number;
}

function schemeDefineIndent(context: TreeIndentContext, head: string): number | null {
  const { node, state } = context;
  const children = expressionChildren(node);
  const doc = state.doc.toString();
  const posLine = lineNumberAt(state, context.pos);
  const openLine = lineNumberAt(state, node.from);
  const base = context.baseIndent;
  const unit = context.unit;

  if (posLine === openLine) {
    return delimitedIndent({ closing: ')', align: true })(context);
  }

  const sig = children[1];
  if (!sig) return base + unit;

  if (sig.name === 'Symbol') {
    return base + unit;
  }

  if (isCollNodeName(sig.name)) {
    if (context.pos <= sig.to && context.pos >= sig.from) {
      return delimitedIndent({ closing: ')', align: true })(context);
    }
    if (posLine > lineNumberAt(state, sig.to)) {
      return base + unit;
    }
  }

  if (head === 'define-syntax' && children.length >= 3) {
    return base + unit;
  }

  return base + unit;
}

function schemeLetIndent(context: TreeIndentContext): number | null {
  const { node, state } = context;
  const children = expressionChildren(node);
  const bindings = children[1];
  const base = context.baseIndent;
  const unit = context.unit;

  if (!bindings || !isCollNodeName(bindings.name)) {
    return base + unit;
  }

  if (context.pos > bindings.from && context.pos < bindings.to) {
    const bindingKids = expressionChildren(bindings);
    if (bindingKids.length > 0) {
      const firstBinding = bindingKids[0]!;
      if (lineNumberAt(state, context.pos) > lineNumberAt(state, bindings.from)) {
        return context.column(firstBinding.from);
      }
    }
    return base + unit;
  }

  if (children.length >= 3 && context.pos >= children[2]!.from) {
    return base + unit;
  }

  return base + unit;
}

function schemeListIndent(context: TreeIndentContext): number | null {
  const { node, state } = context;
  const doc = state.doc.toString();

  if (context.textAfter.match(closingPattern(')'))) {
    return context.continue();
  }

  const head = listHeadSymbol(node, doc);
  const posLine = lineNumberAt(state, context.pos);
  const openLine = lineNumberAt(state, node.from);
  const base = context.baseIndent;
  const unit = context.unit;

  if (posLine === openLine) {
    return delimitedIndent({ closing: ')', align: true })(context);
  }

  if (head && DEFINE_FORMS.has(head)) {
    return schemeDefineIndent(context, head);
  }

  if (head && BINDING_FORMS.has(head)) {
    return schemeLetIndent(context);
  }

  if (head && (BODY_HEAD_FORMS.has(head) || head === 'and' || head === 'or')) {
    return base + unit;
  }

  return delimitedIndent({ closing: ')', align: true })(context);
}

function schemeCollIndent(nodeName: string) {
  const spec = SCHEME_COLL_DELIMS[nodeName]!;
  const closePattern = closingPattern(spec.close);

  return (context: TreeIndentContext): number | null => {
    if (context.textAfter.match(closePattern)) {
      return context.continue();
    }

    if (nodeName === 'List') {
      return schemeListIndent(context);
    }

    return delimitedIndent({ closing: spec.close, align: true })(context);
  };
}

export const schemeIndentNodeProp = indentNodeProp.add({
  List: schemeCollIndent('List'),
  SquareList: schemeCollIndent('SquareList'),
  CurlyList: schemeCollIndent('CurlyList'),
  Vector: schemeCollIndent('Vector'),
  ByteVector: schemeCollIndent('ByteVector'),
});
