import {
  clampSplitRatio,
  splitPaneTabId,
  splitPlacementDirection,
  splitPlacementNewPane,
  splitSurvivorPane,
  tabBarActiveTabId,
  tabsForTabBar,
  SPLIT_RATIO_DEFAULT,
} from '../shared/editorSplit';

describe('editorSplit', () => {
  it('maps placement to direction', () => {
    expect(splitPlacementDirection('left')).toBe('horizontal');
    expect(splitPlacementDirection('right')).toBe('horizontal');
    expect(splitPlacementDirection('top')).toBe('vertical');
    expect(splitPlacementDirection('bottom')).toBe('vertical');
  });

  it('places new file on correct pane', () => {
    expect(splitPlacementNewPane('left')).toBe('primary');
    expect(splitPlacementNewPane('top')).toBe('primary');
    expect(splitPlacementNewPane('right')).toBe('secondary');
    expect(splitPlacementNewPane('bottom')).toBe('secondary');
  });

  it('clamps split ratio', () => {
    expect(clampSplitRatio(0)).toBe(0.2);
    expect(clampSplitRatio(1)).toBe(0.8);
    expect(clampSplitRatio(Number.NaN)).toBe(SPLIT_RATIO_DEFAULT);
    expect(clampSplitRatio(0.55)).toBe(0.55);
  });

  it('resolves pane tab ids and survivor', () => {
    const layout = {
      direction: 'horizontal' as const,
      ratio: 0.5,
      primaryTabId: 'a',
      secondaryTabId: 'b',
      focusedPane: 'primary' as const,
    };
    expect(splitPaneTabId(layout, 'primary')).toBe('a');
    expect(splitPaneTabId(layout, 'secondary')).toBe('b');
    expect(splitSurvivorPane('primary')).toBe('secondary');
    expect(splitSurvivorPane('secondary')).toBe('primary');
  });

  it('hides pane-only tabs from tab bar', () => {
    const tabs = [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
      { id: 'c', label: 'C' },
    ];
    const split = {
      direction: 'horizontal' as const,
      ratio: 0.5,
      primaryTabId: 'a',
      secondaryTabId: 'b',
      focusedPane: 'secondary' as const,
      paneOnlyTabIds: ['b'],
    };
    expect(tabsForTabBar(tabs, split).map((t) => t.id)).toEqual(['a', 'c']);
    expect(tabBarActiveTabId('b', split)).toBe('a');
    expect(tabBarActiveTabId('a', split)).toBe('a');
  });
});
