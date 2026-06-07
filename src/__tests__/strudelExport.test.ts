import {
  defaultStrudelExportFileName,
  STRUDEL_EXPORT_DEFAULTS,
} from '../renderer/lib/strudelExport';

describe('strudelExport', () => {
  it('uses strudel.cc default export parameters', () => {
    expect(STRUDEL_EXPORT_DEFAULTS).toEqual({
      startCycle: 0,
      endCycle: 1,
      sampleRate: 48000,
      maxPolyphony: 1024,
      multiChannelOrbits: true,
    });
  });

  it('derives default file name from relative path', () => {
    expect(defaultStrudelExportFileName('music/test.strudel')).toBe('test');
    expect(defaultStrudelExportFileName(null)).toBe('');
  });
});
