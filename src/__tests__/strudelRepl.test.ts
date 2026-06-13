import {
  disposeStrudelEditor,
  evaluateStrudelEditor,
  readStrudelEditorCode,
  writeStrudelEditorCode,
  type StrudelEditorElement,
} from '../renderer/lib/strudelRepl';

describe('writeStrudelEditorCode', () => {
  it('uses mirror.setCode when the editor mirror is ready', () => {
    const setCode = jest.fn();
    const editor = {
      editor: { setCode },
    } as unknown as StrudelEditorElement;

    writeStrudelEditorCode(editor, 's("bd")');

    expect(setCode).toHaveBeenCalledWith('s("bd")');
  });

  it('falls back to the code property before the mirror mounts', () => {
    const editor = {} as StrudelEditorElement;

    writeStrudelEditorCode(editor, 'note("c4")');

    expect(editor.code).toBe('note("c4")');
  });

  it('normalizes CRLF before writing', () => {
    const setCode = jest.fn();
    const editor = {
      editor: { setCode },
    } as unknown as StrudelEditorElement;

    writeStrudelEditorCode(editor, 'a\r\nb');

    expect(setCode).toHaveBeenCalledWith('a\nb');
  });
});

describe('readStrudelEditorCode', () => {
  it('prefers the live CodeMirror document over mirror.code', () => {
    const editor = {
      editor: {
        code: 'stale',
        editor: {
          state: {
            doc: {
              toString: () => '$: note(`c4`)',
            },
          },
        },
      },
    } as unknown as StrudelEditorElement;

    expect(readStrudelEditorCode(editor)).toBe('$: note(`c4`)');
  });
});

describe('evaluateStrudelEditor', () => {
  it('syncs live editor code before evaluate', async () => {
    const evaluate = jest.fn().mockResolvedValue(undefined);
    const setCode = jest.fn();
    const editor = {
      editor: {
        code: 'stale',
        setCode,
        evaluate,
        editor: {
          state: {
            doc: {
              toString: () => '$: s("bd")',
            },
          },
        },
      },
    } as unknown as StrudelEditorElement;

    await evaluateStrudelEditor(editor, true);

    expect(setCode).toHaveBeenCalledWith('$: s("bd")');
    expect(evaluate).toHaveBeenCalledWith(true);
  });
});

describe('disposeStrudelEditor', () => {
  it('stops mirror, clears listeners, and removes editor nodes', () => {
    const stop = jest.fn().mockResolvedValue(undefined);
    const clear = jest.fn();
    const replStop = jest.fn();
    const schedulerStop = jest.fn();

    const host = document.createElement('div');
    const editor = document.createElement('strudel-editor') as StrudelEditorElement;
    const mirrorRoot = document.createElement('div');

    editor.editor = {
      setCode: () => undefined,
      evaluate: async () => undefined,
      toggle: async () => undefined,
      stop,
      clear,
      repl: {
        evaluate: async () => undefined,
        stop: replStop,
        scheduler: { cps: 1, stop: schedulerStop },
        state: {},
      },
    };

    host.appendChild(editor);
    host.appendChild(mirrorRoot);

    disposeStrudelEditor(editor);

    expect(stop).toHaveBeenCalled();
    expect(replStop).toHaveBeenCalled();
    expect(schedulerStop).toHaveBeenCalled();
    expect(clear).toHaveBeenCalled();
    expect(host.contains(editor)).toBe(false);
    expect(host.contains(mirrorRoot)).toBe(false);
  });
});
