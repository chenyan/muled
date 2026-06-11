export const SCHEME_COLL_NODES = new Set([
  'List',
  'SquareList',
  'CurlyList',
  'Vector',
  'ByteVector',
]);

export const SCHEME_COLL_DELIMS: Record<
  string,
  { open: string; close: string; openLen: number; closeLen: number }
> = {
  List: { open: '(', close: ')', openLen: 1, closeLen: 1 },
  SquareList: { open: '[', close: ']', openLen: 1, closeLen: 1 },
  CurlyList: { open: '{', close: '}', openLen: 1, closeLen: 1 },
  Vector: { open: '#(', close: ')', openLen: 2, closeLen: 1 },
  ByteVector: { open: '#vu8(', close: ')', openLen: 6, closeLen: 1 },
};

export function isCollNodeName(name: string): boolean {
  return SCHEME_COLL_NODES.has(name);
}
