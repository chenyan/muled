import {
  disposeStrudelEditor,
  type StrudelEditorElement,
} from '../renderer/lib/strudelRepl';

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
