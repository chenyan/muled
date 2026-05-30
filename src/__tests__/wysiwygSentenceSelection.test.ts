import {
  extractSentence,
  findSentenceBounds,
} from '../renderer/lib/wysiwygSentenceSelection';

describe('findSentenceBounds', () => {
  it('extracts an English sentence at cursor', () => {
    const text = 'Hello world. How are you? Fine.';
    expect(findSentenceBounds(text, 3)).toEqual({ start: 0, end: 12 });
    expect(findSentenceBounds(text, 14)).toEqual({ start: 13, end: 25 });
  });

  it('extracts a Chinese sentence at cursor', () => {
    const text = '你好世界。今天天气不错！继续工作。';
    expect(findSentenceBounds(text, 2)).toEqual({ start: 0, end: 5 });
    expect(findSentenceBounds(text, 8)).toEqual({ start: 5, end: 12 });
  });

  it('returns the whole text when no terminator exists', () => {
    const text = 'single sentence without ending';
    expect(findSentenceBounds(text, 10)).toEqual({ start: 0, end: 30 });
  });
});

describe('extractSentence', () => {
  it('trims whitespace around the sentence', () => {
    const text = '  First one.   Second one.  ';
    expect(extractSentence(text, 4)).toBe('First one.');
  });
});
