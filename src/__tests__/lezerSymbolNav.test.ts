import { extractFileSymbols } from '../renderer/lib/symbols/extract';
import { OpenTabSymbolIndex } from '../renderer/lib/symbols/openTabSymbolIndex';

describe('extractFileSymbols', () => {
  it('extracts JS/TS definitions and references', () => {
    const content = [
      'export function greet(name: string) {',
      '  return helper(name);',
      '}',
      'function helper(x: string) { return x; }',
      'greet("hi");',
    ].join('\n');
    const { defs, refs } = extractFileSymbols(
      'typescript',
      content,
      'src/greet.ts',
    );
    expect(defs.map((d) => d.name)).toEqual(
      expect.arrayContaining(['greet', 'helper']),
    );
    expect(defs.find((d) => d.name === 'greet')?.kind).toBe('function');
    expect(refs.some((r) => r.name === 'helper')).toBe(true);
    expect(refs.some((r) => r.name === 'greet')).toBe(true);
  });

  it('indexes JavaScript parameters and local variables as definitions', () => {
    const content = [
      'function calculate(input: number) {',
      '  const doubled = input * 2;',
      '  return doubled;',
      '}',
    ].join('\n');
    const { defs } = extractFileSymbols('typescript', content, 'calculate.ts');
    expect(
      defs
        .filter((def) => def.kind === 'variable')
        .map((def) => [def.name, def.outline]),
    ).toEqual(
      expect.arrayContaining([
        ['input', false],
        ['doubled', true],
      ]),
    );
  });

  it('extracts nested class methods with depth', () => {
    const content = [
      'export class Service {',
      '  method() {',
      '    function helper() {}',
      '  }',
      '}',
    ].join('\n');
    const { defs } = extractFileSymbols('typescript', content, 'a.ts');
    expect(defs.map((d) => [d.name, d.depth])).toEqual([
      ['Service', 1],
      ['method', 2],
      ['helper', 3],
    ]);
  });

  it('extracts Python defs and classes', () => {
    const content = [
      'def foo(a):',
      '  return bar(a)',
      '',
      'class Bar:',
      '  def baz(self):',
      '    pass',
    ].join('\n');
    const { defs, refs } = extractFileSymbols('python', content, 'a.py');
    expect(defs.map((d) => [d.name, d.kind, d.depth])).toEqual(
      expect.arrayContaining([
        ['foo', 'function', 1],
        ['Bar', 'class', 1],
        ['baz', 'function', 2],
        ['a', 'variable', 2],
        ['self', 'variable', 3],
      ]),
    );
    expect(refs.some((r) => r.name === 'bar')).toBe(true);
  });

  it('indexes Python parameters, assignments and loop variables', () => {
    const content = [
      'def total(values):',
      '  result = 0',
      '  for value in values:',
      '    result = result + value',
      '  return result',
    ].join('\n');
    const { defs } = extractFileSymbols('python', content, 'total.py');
    expect(defs.map((def) => def.name)).toEqual(
      expect.arrayContaining(['values', 'result', 'value']),
    );
    expect(
      defs
        .filter((def) => ['values', 'result', 'value'].includes(def.name))
        .every((def) => !def.outline),
    ).toBe(true);
  });

  it('extracts Scheme defines', () => {
    const content = '(define (foo x) x)\n(define bar 1)\n(foo bar)\n';
    const { defs, refs } = extractFileSymbols('scheme', content, 'a.scm');
    expect(defs.map((d) => d.name)).toEqual(
      expect.arrayContaining(['foo', 'bar']),
    );
    expect(refs.some((r) => r.name === 'foo')).toBe(true);
    expect(defs.some((d) => d.name === 'x' && !d.outline)).toBe(true);
  });

  it('extracts Rust functions and structs', () => {
    const content = [
      'fn foo(a: i32) -> i32 { bar(a) }',
      'struct Bar { x: i32 }',
      'impl Bar { fn baz(&self) {} }',
    ].join('\n');
    const { defs } = extractFileSymbols('rust', content, 'a.rs');
    expect(defs.map((d) => d.name)).toEqual(
      expect.arrayContaining(['foo', 'Bar', 'baz', 'a']),
    );
  });

  it('extracts Go functions and types', () => {
    const content =
      'func Foo(a int) int { return Bar(a) }\ntype Bar struct { X int }\n';
    const { defs } = extractFileSymbols('go', content, 'a.go');
    expect(defs.map((d) => d.name)).toEqual(
      expect.arrayContaining(['Foo', 'Bar', 'a']),
    );
  });

  it('extracts Java classes and methods', () => {
    const content = 'class Foo { void bar(int a) { baz(a); } }\n';
    const { defs } = extractFileSymbols('java', content, 'Foo.java');
    expect(defs.map((d) => d.name)).toEqual(
      expect.arrayContaining(['Foo', 'bar', 'a']),
    );
  });

  it('extracts C++ functions and classes', () => {
    const content =
      'int foo(int a) { return bar(a); }\nclass Bar { int x; void baz(); };\n';
    const { defs } = extractFileSymbols('cpp', content, 'a.cpp');
    expect(defs.map((d) => d.name)).toEqual(
      expect.arrayContaining(['foo', 'Bar', 'a']),
    );
  });
});

describe('OpenTabSymbolIndex', () => {
  it('indexes open tabs and finds cross-tab definitions', () => {
    const index = new OpenTabSymbolIndex();
    index.syncTabs([
      {
        tabId: '1',
        relativePath: 'a.ts',
        content: 'export function shared() {}\n',
        languageId: 'typescript',
      },
      {
        tabId: '2',
        relativePath: 'b.ts',
        content: 'function local() { shared(); }\n',
        languageId: 'typescript',
      },
    ]);
    const defs = index.findDefinitions('shared', 'b.ts');
    expect(defs).toHaveLength(1);
    expect(defs[0]?.relativePath).toBe('a.ts');
    const refs = index.findReferences('shared');
    expect(refs.some((r) => r.relativePath === 'b.ts')).toBe(true);
  });

  it('removes closed tabs from the index', () => {
    const index = new OpenTabSymbolIndex();
    index.syncTabs([
      {
        tabId: '1',
        relativePath: 'a.ts',
        content: 'function gone() {}\n',
        languageId: 'typescript',
      },
    ]);
    expect(index.findDefinitions('gone')).toHaveLength(1);
    index.syncTabs([]);
    expect(index.findDefinitions('gone')).toHaveLength(0);
  });

  it('filters definitions by query', () => {
    const index = new OpenTabSymbolIndex();
    index.syncTabs([
      {
        tabId: '1',
        relativePath: 'a.ts',
        content: 'function alpha() {}\nfunction beta() {}\n',
        languageId: 'typescript',
      },
    ]);
    expect(index.filterDefinitions('alp').map((d) => d.name)).toEqual([
      'alpha',
    ]);
  });
});
