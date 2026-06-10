import {
  getEditorViewContent,
  registerEditorViewHandlers,
} from '../renderer/lib/editorViewBridge';

describe('getEditorViewContent', () => {
  afterEach(() => {
    registerEditorViewHandlers('tab-1', null);
  });

  it('returns live editor content when handlers are registered', () => {
    registerEditorViewHandlers('tab-1', {
      getEditorContent: () => 'live strudel code',
      appendToEnd: () => undefined,
    });
    expect(getEditorViewContent('tab-1')).toBe('live strudel code');
  });

  it('returns null when no handlers are registered', () => {
    expect(getEditorViewContent('missing')).toBeNull();
  });
});
