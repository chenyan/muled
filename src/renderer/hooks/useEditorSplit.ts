import { useCallback, useEffect, useMemo, useState } from 'react';
import type { EditorTab } from '../types/tab';
import {
  clampSplitRatio,
  splitPaneTabId,
  splitPlacementDirection,
  splitPlacementNewPane,
  splitSurvivorPane,
  SPLIT_RATIO_DEFAULT,
  type EditorSplitLayout,
  type SplitPaneId,
  type SplitPlacement,
} from '../../shared/editorSplit';

export function useEditorSplit(tabs: EditorTab[]) {
  const [split, setSplit] = useState<EditorSplitLayout | null>(null);

  const tabIds = useMemo(() => new Set(tabs.map((t) => t.id)), [tabs]);

  useEffect(() => {
    if (!split) return;
    const { primaryTabId, secondaryTabId } = split;
    if (!tabIds.has(primaryTabId) || !tabIds.has(secondaryTabId)) {
      const survivor =
        tabIds.has(primaryTabId) && !tabIds.has(secondaryTabId)
          ? primaryTabId
          : tabIds.has(secondaryTabId) && !tabIds.has(primaryTabId)
            ? secondaryTabId
            : null;
      setSplit(null);
      if (survivor) {
        // active tab correction handled by caller via activeTabId effect
      }
    } else if (primaryTabId === secondaryTabId) {
      setSplit(null);
    }
  }, [split, tabIds]);

  const clearSplit = useCallback(() => {
    setSplit(null);
  }, []);

  const setSplitRatio = useCallback((ratio: number) => {
    setSplit((prev) =>
      prev ? { ...prev, ratio: clampSplitRatio(ratio) } : prev,
    );
  }, []);

  const focusSplitPane = useCallback((pane: SplitPaneId) => {
    setSplit((prev) => (prev ? { ...prev, focusedPane: pane } : prev));
  }, []);

  const buildSplitLayout = useCallback(
    (
      placement: SplitPlacement,
      primaryTabId: string,
      secondaryTabId: string,
      existing?: EditorSplitLayout | null,
    ): EditorSplitLayout => {
      const focusedPane = splitPlacementNewPane(placement);
      return {
        direction: splitPlacementDirection(placement),
        ratio: existing?.ratio ?? SPLIT_RATIO_DEFAULT,
        primaryTabId,
        secondaryTabId,
        focusedPane,
      };
    },
    [],
  );

  const assignSplit = useCallback((layout: EditorSplitLayout) => {
    setSplit({
      ...layout,
      ratio: clampSplitRatio(layout.ratio),
    });
  }, []);

  const getFocusedTabId = useCallback(
    (layout: EditorSplitLayout | null): string | null => {
      if (!layout) return null;
      return splitPaneTabId(layout, layout.focusedPane);
    },
    [],
  );

  const getSurvivorTabIdAfterClosePane = useCallback(
    (layout: EditorSplitLayout, closed: SplitPaneId): string => {
      return splitPaneTabId(layout, splitSurvivorPane(closed));
    },
    [],
  );

  return {
    split,
    setSplit,
    clearSplit,
    setSplitRatio,
    focusSplitPane,
    buildSplitLayout,
    assignSplit,
    getFocusedTabId,
    getSurvivorTabIdAfterClosePane,
  };
}
