import {
  applyAiToContent,
  buildAiUserContent,
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
});
