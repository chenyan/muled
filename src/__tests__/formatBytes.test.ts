import { formatBytes } from '../shared/formatBytes';

describe('formatBytes', () => {
  it('formats small and large sizes', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(16 * 1024 * 1024)).toBe('16.0 MB');
  });
});
