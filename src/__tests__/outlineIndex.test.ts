import { buildOutlineTree, buildTabOutline } from '../renderer/lib/outlineIndex';
import type { EditorTab } from '../renderer/types/tab';

function createTab(partial: Partial<EditorTab>): EditorTab {
  return {
    id: 't1',
    relativePath: 'doc.md',
    kind: 'markdown',
    dirty: false,
    keybindingMode: 'normal',
    viewMode: 'source',
    content: '',
    truncated: false,
    fileSize: 0,
    ...partial,
  };
}

describe('buildTabOutline', () => {
  it('extracts markdown headings up to h3', () => {
    const tab = createTab({
      kind: 'markdown',
      content: '# H1\n## H2\n### H3\n#### skip',
    });
    const items = buildTabOutline(tab, []);
    expect(items.map((item) => item.title)).toEqual(['H1', 'H2', 'H3']);
    expect(items.map((item) => item.depth)).toEqual([1, 2, 3]);
  });

  it('extracts top-level symbols for code tab', () => {
    const tab = createTab({
      kind: 'text',
      relativePath: 'src/a.ts',
      content:
        'export class Service {}\n' +
        'function inner() {}\n' +
        '  function nested() {}\n' +
        'const userName = "a";',
    });
    const items = buildTabOutline(tab, []);
    expect(items.map((item) => item.title)).toEqual([
      'Service',
      'inner',
      'userName',
    ]);
  });

  it('extracts nested symbols inside brace blocks', () => {
    const tab = createTab({
      kind: 'text',
      relativePath: 'src/a.ts',
      content: [
        'export class Service {',
        '  method() {',
        '    helper() {}',
        '  }',
        '}',
      ].join('\n'),
    });
    const items = buildTabOutline(tab, []);
    expect(items.map((item) => [item.title, item.depth])).toEqual([
      ['Service', 1],
      ['method', 2],
      ['helper', 3],
    ]);
  });

  it('builds outline tree from flat depth items', () => {
    const tree = buildOutlineTree([
      { id: '1', title: 'H1', depth: 1, line: 1, page: null },
      { id: '2', title: 'H2', depth: 2, line: 2, page: null },
      { id: '3', title: 'H3', depth: 3, line: 3, page: null },
      { id: '4', title: 'H2b', depth: 2, line: 4, page: null },
    ]);
    expect(tree.map((node) => node.item.title)).toEqual(['H1']);
    expect(tree[0]!.children.map((node) => node.item.title)).toEqual([
      'H2',
      'H2b',
    ]);
    expect(tree[0]!.children[0]!.children.map((node) => node.item.title)).toEqual([
      'H3',
    ]);
  });

  it('uses provided pdf outline', () => {
    const tab = createTab({
      kind: 'pdf',
      relativePath: 'book.pdf',
    });
    const items = buildTabOutline(tab, [
      { title: 'Chapter 1', depth: 1, page: 3 },
      { title: 'Section', depth: 2, page: 5 },
    ]);
    expect(items.map((item) => item.title)).toEqual(['Chapter 1', 'Section']);
    expect(items.map((item) => item.page)).toEqual([3, 5]);
  });
});
