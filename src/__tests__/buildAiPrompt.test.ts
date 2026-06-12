import {
  applyAiToContent,
  buildAiUserContent,
  findSelectionSpan,
  textAfterAi,
} from '../shared/buildAiPrompt';
import { applyAiInEditor } from '../renderer/lib/applyAiInEditor';

describe('buildAiUserContent', () => {
  it('joins prompt and selection with separator', () => {
    expect(buildAiUserContent('summarize', 'hello')).toBe(
      'summarize\n\n---\nhello',
    );
  });
});

describe('textAfterAi', () => {
  it('appends after selection for append mode', () => {
    expect(textAfterAi('append', 'foo', ' bar')).toBe('foo bar');
  });

  it('replaces selection for replace mode', () => {
    expect(textAfterAi('replace', 'foo', 'bar')).toBe('bar');
  });
});

describe('applyAiToContent', () => {
  it('replaces first occurrence of selection', () => {
    expect(applyAiToContent('aa bb aa', 'aa', 'replace', 'XX')).toBe(
      'XX bb aa',
    );
  });
});

describe('findSelectionSpan', () => {
  it('finds trimmed selection when stored text had outer whitespace', () => {
    expect(findSelectionSpan('aa  hello  bb', 'hello')).toEqual({
      from: 4,
      to: 9,
    });
  });

  it('matches across CRLF vs LF', () => {
    expect(findSelectionSpan('a\r\nb', 'a\nb')).toEqual({ from: 0, to: 3 });
  });
});

describe('applyAiInEditor', () => {
  it('uses source range when provided', () => {
    const result = applyAiInEditor(
      'hello world',
      { selection: 'world', sourceRange: { from: 6, to: 11 } },
      'replace',
      'there',
    );
    expect(result).toBe('hello there');
  });

  it('appends at source range using live document slice', () => {
    const result = applyAiInEditor(
      'hello world',
      { selection: 'world', sourceRange: { from: 6, to: 11 } },
      'append',
      '!',
    );
    expect(result).toBe('hello world!');
  });

  it('appends using live slice at source range when snapshot text was trimmed', () => {
    const result = applyAiInEditor(
      'aa  hello  bb',
      { selection: 'hello', sourceRange: { from: 2, to: 10 } },
      'append',
      '!',
    );
    expect(result).toBe('aa  hello ! bb');
  });

  it('clamps range when document shrank after AI request (append)', () => {
    const result = applyAiInEditor(
      'hi',
      { selection: 'hello world', sourceRange: { from: 0, to: 11 } },
      'append',
      '!',
    );
    expect(result).toBe('hi!');
  });

  it('replaces full source range slice (including padding)', () => {
    const result = applyAiInEditor(
      'aa  hello  bb',
      { selection: 'hello', sourceRange: { from: 2, to: 10 } },
      'replace',
      'bye',
    );
    expect(result).toBe('aabye bb');
  });

  it('clamps range when document shrank after AI request (replace)', () => {
    const result = applyAiInEditor(
      'hi',
      { selection: 'hello world', sourceRange: { from: 0, to: 11 } },
      'replace',
      'ok',
    );
    expect(result).toBe('ok');
  });

  it('replace via findSelectionSpan when sourceRange missing', () => {
    const result = applyAiInEditor(
      'aa  hello  bb',
      { selection: 'hello', sourceRange: null },
      'replace',
      'bye',
    );
    expect(result).toBe('aa  bye  bb');
  });

  it('appends at cursor when there is no selection', () => {
    const result = applyAiInEditor(
      'hello world',
      { selection: '', sourceRange: { from: 5, to: 5 } },
      'append',
      'X',
    );
    expect(result).toBe('helloX world');
  });

  it('appends at document end when there is no selection or range', () => {
    const result = applyAiInEditor(
      'hello',
      { selection: '', sourceRange: null },
      'append',
      ' world',
    );
    expect(result).toBe('hello world');
  });
});
