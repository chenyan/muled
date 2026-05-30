import {
  parseRgJsonLines,
  parseShellArgs,
} from '../main/services/shellSearchService';
import { toWorkspaceRelativePath } from '../shared/pathUtils';
import {
  parsePaletteShellSearch,
  paletteShellSearchLabel,
} from '../renderer/lib/paletteShellSearch';

describe('parseShellArgs', () => {
  it('splits quoted args', () => {
    expect(parseShellArgs('foo bar')).toEqual(['foo', 'bar']);
    expect(parseShellArgs('"foo bar" baz')).toEqual(['foo bar', 'baz']);
  });
});

describe('parseRgJsonLines', () => {
  it('parses rg json match lines', () => {
    const line = JSON.stringify({
      type: 'match',
      data: {
        path: { text: '/tmp/workspace/src/foo.ts' },
        lines: { text: '  const foo = 1;\n' },
        line_number: 3,
        submatches: [{ start: 8, end: 11, match: { text: 'foo' } }],
      },
    });

    expect(parseRgJsonLines(`${line}\n`, '/tmp/workspace')).toEqual([
      {
        kind: 'rg',
        path: 'src/foo.ts',
        absolutePath: '/tmp/workspace/src/foo.ts',
        line: 3,
        column: 8,
        length: 3,
        lineText: '  const foo = 1;',
        matchText: 'foo',
      },
    ]);
  });
});

describe('toWorkspaceRelativePath', () => {
  it('resolves rg/fd relative paths against workspace root', () => {
    const root = '/tmp/workspace';
    expect(toWorkspaceRelativePath(root, 'src/foo.ts')).toBe('src/foo.ts');
    expect(toWorkspaceRelativePath(root, '/tmp/workspace/src/foo.ts')).toBe(
      'src/foo.ts',
    );
    expect(toWorkspaceRelativePath(root, '/tmp/other/foo.ts')).toBeNull();
  });
});

describe('parsePaletteShellSearch', () => {
  it('detects rg and fd commands', () => {
    expect(parsePaletteShellSearch('rg pattern')).toEqual({
      command: 'rg',
      query: 'pattern',
    });
    expect(parsePaletteShellSearch('fd *.ts')).toEqual({
      command: 'fd',
      query: '*.ts',
    });
    expect(parsePaletteShellSearch('cd foo')).toBeNull();
  });

  it('formats result labels', () => {
    expect(
      paletteShellSearchLabel({
        kind: 'rg',
        path: 'a.ts',
        absolutePath: '/tmp/a.ts',
        line: 2,
        column: 4,
        length: 3,
        lineText: 'foo',
        matchText: 'bar',
      }),
    ).toBe('a.ts:2:5');
  });
});
