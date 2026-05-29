import {
  resolveActiveAfterClose,
  resolveTargetTabId,
} from '../renderer/hooks/useEditorTabs';
import type { EditorTab } from '../renderer/types/tab';

function tab(id: string, path: string | null): EditorTab {
  return {
    id,
    relativePath: path,
    kind: 'markdown',
    dirty: false,
    keybindingMode: 'vim',
    viewMode: 'source',
    content: '',
    truncated: false,
    fileSize: 0,
  };
}

describe('resolveTargetTabId', () => {
  it('uses active tab when valid', () => {
    const tabs = [tab('a', null), tab('b', 'x.md')];
    expect(resolveTargetTabId(tabs, 'b')).toBe('b');
  });

  it('falls back to untitled when active id is stale', () => {
    const tabs = [tab('untitled', null)];
    expect(resolveTargetTabId(tabs, 'gone')).toBe('untitled');
  });
});

describe('resolveActiveAfterClose', () => {
  it('activates fresh tab when active id is stale after closing the last tab', () => {
    const prev = [tab('only', 'a.md')];
    const fresh = tab('fresh', null);
    expect(
      resolveActiveAfterClose(prev, 'only', 'stale-active', [fresh], fresh),
    ).toBe('fresh');
  });

  it('keeps valid active when closing a non-active tab', () => {
    const prev = [tab('a', 'a.md'), tab('b', 'b.md')];
    const final = [tab('a', 'a.md')];
    expect(resolveActiveAfterClose(prev, 'b', 'a', final, null)).toBe('a');
  });
});
