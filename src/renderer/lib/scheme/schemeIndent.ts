import {
  delimitedIndent,
  indentNodeProp,
  indentService,
  syntaxTree,
  type IndentContext,
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

const CLOSING_PARENS_AFTER = /^\s*\)+/;

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

function listExpectsBody(node: SyntaxNode, doc: string): boolean {
  const head = listHeadSymbol(node, doc);
  if (!head) return false;
  return (
    DEFINE_FORMS.has(head) ||
    BINDING_FORMS.has(head) ||
    BODY_HEAD_FORMS.has(head) ||
    head === 'and' ||
    head === 'or'
  );
}

function hasBodyExpressionBefore(
  children: SyntaxNode[],
  beforePos: number,
): boolean {
  for (let i = 2; i < children.length; i++) {
    if (children[i]!.from < beforePos) return true;
  }
  return false;
}

function textAfterPos(
  cx: IndentContext | TreeIndentContext,
  pos: number,
): string {
  return cx.textAfterPos(pos);
}

/** 闭括号已在下一行/同行末尾，但尚未写入函数体时，仍应缩进 body 而非 dedent */
function shouldIndentBodyBeforeCloseList(
  cx: IndentContext | TreeIndentContext,
  pos: number,
  node: SyntaxNode,
): boolean {
  const { state } = cx;
  const doc = state.doc.toString();
  if (!listExpectsBody(node, doc)) return false;

  const children = expressionChildren(node);
  if (children.length < 2) return false;

  const simBreak = cx.simulatedBreak;
  if (simBreak != null && CLOSING_PARENS_AFTER.test(textAfterPos(cx, pos))) {
    return !hasBodyExpressionBefore(children, simBreak);
  }

  const posLine = lineNumberAt(state, pos);
  const headLine = lineNumberAt(state, node.from);
  if (posLine <= headLine) return false;

  const headerEnd = children[1]!.to;
  if (posLine <= lineNumberAt(state, headerEnd)) return false;

  return !hasBodyExpressionBefore(children, pos);
}

function shouldIndentBodyBeforeClose(
  context: TreeIndentContext,
  node: SyntaxNode,
): boolean {
  return shouldIndentBodyBeforeCloseList(context, context.pos, node);
}

function schemeBodyIndentForList(
  context: TreeIndentContext,
  list: SyntaxNode,
): number {
  return context.baseIndentFor(list) + context.unit;
}

/** 处理 ")" 节点：Enter 在 `(define (f x)|)` 处时 delimitedStrategy 会错误 dedent */
function schemeClosingParenIndent(context: TreeIndentContext): number | null {
  for (let list = context.node.parent; list; list = list.parent) {
    if (list.name !== 'List') continue;
    if (shouldIndentBodyBeforeClose(context, list)) {
      return schemeBodyIndentForList(context, list);
    }
    return context.baseIndentFor(list);
  }
  return context.baseIndent;
}

function schemeDefineIndent(context: TreeIndentContext, head: string): number | null {
  const { node, state } = context;
  const children = expressionChildren(node);
  const posLine = lineNumberAt(state, context.pos);
  const openLine = lineNumberAt(state, node.from);
  const base = context.baseIndent;
  const unit = context.unit;

  if (posLine === openLine) {
    if (shouldIndentBodyBeforeClose(context, node)) {
      return base + unit;
    }
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

  const closingOnLine = context.textAfter.match(closingPattern(')'));
  if (closingOnLine && !shouldIndentBodyBeforeClose(context, node)) {
    return context.continue();
  }

  const head = listHeadSymbol(node, doc);
  const posLine = lineNumberAt(state, context.pos);
  const openLine = lineNumberAt(state, node.from);
  const base = context.baseIndent;
  const unit = context.unit;

  if (posLine === openLine) {
    if (shouldIndentBodyBeforeClose(context, node)) {
      return base + unit;
    }
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
    const closingOnLine = context.textAfter.match(closePattern);
    if (closingOnLine && !shouldIndentBodyBeforeClose(context, context.node)) {
      return context.continue();
    }

    if (nodeName === 'List') {
      return schemeListIndent(context);
    }

    return delimitedIndent({ closing: spec.close, align: true })(context);
  };
}

export const schemeIndentNodeProp = indentNodeProp.add({
  ')': schemeClosingParenIndent,
  List: schemeCollIndent('List'),
  SquareList: schemeCollIndent('SquareList'),
  CurlyList: schemeCollIndent('CurlyList'),
  Vector: schemeCollIndent('Vector'),
  ByteVector: schemeCollIndent('ByteVector'),
});

/** Enter 在 `(define (f x)|)` 或 `(define (f n|))` 同行闭括号前 */
export function schemeEnterIndentService(
  cx: IndentContext,
  pos: number,
): number | undefined {
  const simBreak = cx.simulatedBreak;
  if (simBreak == null || !CLOSING_PARENS_AFTER.test(cx.textAfterPos(pos))) {
    return undefined;
  }

  let node: SyntaxNode | null = syntaxTree(cx.state).resolveInner(pos, -1);
  while (node) {
    if (node.name === 'List' && shouldIndentBodyBeforeCloseList(cx, pos, node)) {
      return cx.lineIndent(node.from) + cx.unit;
    }
    node = node.parent;
  }
  return undefined;
}

export const schemeIndentServiceExtension = indentService.of(
  schemeEnterIndentService,
);
