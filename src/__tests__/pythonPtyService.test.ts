import {
  ipythonLoadCommand,
  isIpythonPromptReady,
} from '../main/services/pythonPtyService';
import { stripPtyAnsi } from '../main/services/bunPtyService';

describe('ipythonLoadCommand', () => {
  it('escapes single quotes in file paths', () => {
    expect(ipythonLoadCommand("/tmp/o'brien.py")).toBe(
      "%run '/tmp/o\\'brien.py'\r",
    );
  });

  it('normalizes windows separators', () => {
    expect(ipythonLoadCommand('C:\\work\\demo.py')).toBe(
      "%run 'C:/work/demo.py'\r",
    );
  });
});

describe('isIpythonPromptReady', () => {
  it('detects IPython numbered prompt', () => {
    const buffer = 'Python 3.12.0\r\nType "help" ...\r\nIn [1]: ';
    expect(isIpythonPromptReady(buffer)).toBe(true);
  });

  it('detects classic python prompt', () => {
    expect(isIpythonPromptReady('>>> ')).toBe(true);
  });

  it('ignores partial prompts', () => {
    expect(isIpythonPromptReady('In [')).toBe(false);
  });

  it('strips ansi before matching', () => {
    const plain = 'In [1]: ';
    const ansi = `\x1b[32m${plain}`;
    expect(isIpythonPromptReady(ansi)).toBe(true);
    expect(stripPtyAnsi(ansi)).toBe(plain);
  });
});
