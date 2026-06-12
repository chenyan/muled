import {
  disposeStrudelEditor,
  writeStrudelEditorCode,
  type StrudelEditorElement,
} from '../renderer/lib/strudelRepl';

describe('writeStrudelEditorCode', () => {
  it('uses mirror.setCode when the editor mirror is ready', () => {
    const setCode = jest.fn();
    const setAttribute = jest.fn();
    const editor = {
      editor: { setCode },
      setAttribute,
    } as unknown as StrudelEditorElement;

    writeStrudelEditorCode(editor, 's("bd")');

    expect(setCode).toHaveBeenCalledWith('s("bd")');
    expect(setAttribute).not.toHaveBeenCalled();
  });

  it('falls back to the code attribute before the mirror mounts', () => {
    const setAttribute = jest.fn();
    const editor = { setAttribute } as unknown as StrudelEditorElement;

    writeStrudelEditorCode(editor, 'note("c4")');

    expect(setAttribute).toHaveBeenCalledWith('code', 'note("c4")');
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
