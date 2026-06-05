import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from 'react';
import type {
  EditorMode,
  EditorViewMode,
  PublicConfig,
} from '../../shared/types/config';
import { isHtmlPath, isMarkdownPath } from '../lib/fileLanguage';
import { exportWikiImagesFromMarkdown } from '../lib/normalizeMarkdownWikiImages';
import {
  isAudioPath,
  isDirectoryPath,
  isImagePath,
  isPdfPath,
} from '../lib/mime';
import keybindingModePatch from '../lib/keybindingMode';
import { pushStatusToast } from '../lib/statusToast';
import {
  needsBinaryHydration,
  releaseTabBinaryPayload,
  releaseTabResources,
} from '../lib/tabResources';
import { newId } from '../../shared/id';
import {
  resolveUnsavedProceed,
  type SaveTabResult,
  type UnsavedChangesChoice,
} from '../lib/unsavedChanges';
import {
  canTabNavigateBack,
  canTabNavigateForward,
  createTabNavigationStacks,
  pushTabNavigationBack,
  tabNavigationGoBack,
  tabNavigationGoForward,
  type TabNavigationStacks,
} from '../lib/tabNavigationHistory';
import type { EditorTab, EditorRevealTarget, TabKind } from '../types/tab';
import {
  splitPaneTabId,
  splitPlacementDirection,
  splitPlacementNewPane,
  type EditorSplitLayout,
  type SplitPlacement,
} from '../../shared/editorSplit';

export type ConfirmUnsavedChanges = (
  tab: EditorTab,
) => Promise<UnsavedChangesChoice>;

function createEmptyTab(config: PublicConfig): EditorTab {
  return {
    id: newId(),
    relativePath: null,
    kind: 'markdown',
    dirty: false,
    keybindingMode: config.editor.mode,
    viewMode: config.editor.default_view,
    content: '',
    truncated: false,
    fileSize: 0,
  };
}

async function loadFileIntoTab(
  relativePath: string,
  base: Omit<
    EditorTab,
    | 'id'
    | 'relativePath'
    | 'kind'
    | 'content'
    | 'truncated'
    | 'fileSize'
    | 'imageSrc'
    | 'pdfSrc'
    | 'audioSrc'
  >,
): Promise<EditorTab> {
  if (isPdfPath(relativePath)) {
    const { base64, mime } = await window.muled.file.readBinary(relativePath);
    return {
      ...base,
      id: newId(),
      relativePath,
      kind: 'pdf',
      content: '',
      truncated: false,
      fileSize: 0,
      pdfSrc: `data:${mime};base64,${base64}`,
      dirty: false,
    };
  }

  if (isImagePath(relativePath)) {
    const { base64, mime } = await window.muled.file.readBinary(relativePath);
    return {
      ...base,
      id: newId(),
      relativePath,
      kind: 'image',
      content: '',
      truncated: false,
      fileSize: 0,
      imageSrc: `data:${mime};base64,${base64}`,
      dirty: false,
    };
  }

  if (isAudioPath(relativePath)) {
    const { base64, mime } = await window.muled.file.readBinary(relativePath);
    return {
      ...base,
      id: newId(),
      relativePath,
      kind: 'audio',
      content: '',
      truncated: false,
      fileSize: 0,
      audioSrc: `data:${mime};base64,${base64}`,
      dirty: false,
    };
  }

  const file = await window.muled.file.read(relativePath);
  const markdown = isMarkdownPath(relativePath);
  const html = isHtmlPath(relativePath);
  const content = markdown
    ? exportWikiImagesFromMarkdown(file.content)
    : file.content;
  return {
    ...base,
    id: newId(),
    relativePath,
    kind: markdown ? 'markdown' : html ? 'html' : 'text',
    viewMode: markdown ? 'rich-text' : html ? 'preview' : 'source',
    content,
    truncated: file.truncated,
    fileSize: file.fileSize,
    dirty: false,
  };
}

/** 当前应接收文件内容的 Tab：优先激活 Tab，否则 Untitled，否则第一个 */
export function resolveTargetTabId(
  tabs: EditorTab[],
  activeTabId: string | null,
): string | null {
  if (activeTabId && tabs.some((t) => t.id === activeTabId)) {
    return activeTabId;
  }
  const untitled = tabs.find((t) => t.relativePath === null);
  if (untitled) return untitled.id;
  return tabs[0]?.id ?? null;
}

/** 关闭标签后校正 activeTabId，避免指向已关闭或已替换的标签 */
export function resolveActiveAfterClose(
  prevTabs: EditorTab[],
  closedTabId: string,
  currentActive: string | null,
  finalTabs: EditorTab[],
  freshTab: EditorTab | null,
): string | null {
  if (freshTab) return freshTab.id;
  if (finalTabs.length === 0) return null;
  if (currentActive && finalTabs.some((t) => t.id === currentActive)) {
    return currentActive;
  }
  if (currentActive === closedTabId) {
    const idx = prevTabs.findIndex((t) => t.id === closedTabId);
    const nextIdx = Math.min(Math.max(idx, 0), finalTabs.length - 1);
    return finalTabs[nextIdx]?.id ?? finalTabs[0].id;
  }
  return resolveTargetTabId(finalTabs, currentActive);
}

export function useEditorTabs(
  config: PublicConfig | null,
  options?: {
    confirmUnsaved?: ConfirmUnsavedChanges;
    /** 分屏等仍渲染在界面上的标签，切换焦点时不释放 pdfSrc/imageSrc */
    retainBinaryTabIdsRef?: MutableRefObject<readonly string[]>;
  },
) {
  const confirmUnsaved = options?.confirmUnsaved;
  const retainBinaryTabIdsRef = options?.retainBinaryTabIdsRef;
  const [tabs, setTabs] = useState<EditorTab[]>(() =>
    config ? [createEmptyTab(config)] : [],
  );
  const [activeTabId, setActiveTabId] = useState<string | null>(() =>
    config ? (tabs[0]?.id ?? null) : null,
  );

  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId) ?? null,
    [tabs, activeTabId],
  );

  const activeTabIdRef = useRef(activeTabId);
  activeTabIdRef.current = activeTabId;

  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;

  const configRef = useRef(config);
  configRef.current = config;

  const confirmUnsavedRef = useRef(confirmUnsaved);
  confirmUnsavedRef.current = confirmUnsaved;

  const tabNavStacksRef = useRef(new Map<string, TabNavigationStacks>());
  const [tabNavRevision, setTabNavRevision] = useState(0);
  const bumpTabNav = useCallback(() => {
    setTabNavRevision((n) => n + 1);
  }, []);

  const clearTabNavigation = useCallback(
    (tabId: string | null | undefined) => {
      if (!tabId) return;
      if (tabNavStacksRef.current.delete(tabId)) {
        bumpTabNav();
      }
    },
    [bumpTabNav],
  );

  const getTabNavigationStacks = useCallback((tabId: string): TabNavigationStacks => {
    return tabNavStacksRef.current.get(tabId) ?? createTabNavigationStacks();
  }, []);

  const getTabNavigation = useCallback(
    (tabId: string | null) => {
      if (!tabId) {
        return { canGoBack: false, canGoForward: false };
      }
      const tab = tabsRef.current.find((t) => t.id === tabId);
      if (!tab || tab.kind !== 'markdown') {
        return { canGoBack: false, canGoForward: false };
      }
      const stacks = getTabNavigationStacks(tabId);
      return {
        canGoBack: canTabNavigateBack(stacks),
        canGoForward: canTabNavigateForward(stacks),
      };
    },
    [getTabNavigationStacks],
  );

  const tabNavigation = useMemo(() => {
    const nav = getTabNavigation(activeTabId);
    return nav;
    // tabNavRevision drives recompute when stacks change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabId, getTabNavigation, tabNavRevision]);

  useEffect(() => {
    if (tabs.length === 0) {
      if (activeTabId !== null) setActiveTabId(null);
      return;
    }
    if (!activeTabId || !tabs.some((t) => t.id === activeTabId)) {
      setActiveTabId(resolveTargetTabId(tabs, activeTabId));
    }
  }, [tabs, activeTabId]);

  const saveTab = useCallback(async (tabId: string): Promise<SaveTabResult> => {
    const tab = tabsRef.current.find((t) => t.id === tabId);
    if (!tab) return { ok: false, reason: 'not_found' };
    if (!tab.relativePath) {
      return { ok: false, reason: 'no_path' };
    }
    if (tab.truncated) {
      return { ok: false, reason: 'truncated' };
    }
    if (tab.kind === 'image' || tab.kind === 'pdf' || tab.kind === 'audio') {
      return { ok: false, reason: 'image' };
    }

    await window.muled.file.write(tab.relativePath, tab.content);
    setTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, dirty: false } : t)),
    );
    return { ok: true };
  }, []);

  const saveTabRef = useRef(saveTab);
  saveTabRef.current = saveTab;

  const ensureCanProceed = useCallback(async (tab: EditorTab | undefined) => {
    return resolveUnsavedProceed(
      tab,
      confirmUnsavedRef.current,
      (tabId) => saveTabRef.current(tabId),
      (reason) => {
        if (reason === 'truncated') {
          pushStatusToast('文件已截断，无法保存', 'error');
        } else if (reason === 'no_path') {
          pushStatusToast('请先打开文件再保存', 'error');
        } else {
          pushStatusToast('无法保存', 'error');
        }
      },
      () => pushStatusToast('已保存', 'success'),
    );
  }, []);

  const replaceTabWithPath = useCallback(
    async (tabId: string, relativePath: string) => {
      const cfg = configRef.current;
      if (!cfg || isDirectoryPath(relativePath)) {
        return;
      }

      const target = tabsRef.current.find((t) => t.id === tabId);
      if (!target) return;
      if (!(await ensureCanProceed(target))) return;

      const base = {
        dirty: false,
        keybindingMode: target.keybindingMode,
        viewMode:
          target.kind === 'markdown' || target.kind === 'html'
            ? target.viewMode
            : cfg.editor.default_view,
      } as const;

      try {
        const loaded = await loadFileIntoTab(relativePath, base);
        setTabs((prev) =>
          prev.map((t) => {
            if (t.id !== tabId) return t;
            releaseTabResources(t);
            return { ...loaded, id: tabId };
          }),
        );
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        pushStatusToast(`无法打开文件: ${message}`, 'error');
      }
    },
    [ensureCanProceed],
  );

  const activateTabId = useCallback(
    async (tabId: string, options?: { checkUnsaved?: boolean }) => {
      if (tabId === activeTabIdRef.current) return;

      const leavingId = activeTabIdRef.current;
      const leaving = tabsRef.current.find((t) => t.id === leavingId);
      const checkUnsaved = options?.checkUnsaved !== false;
      if (checkUnsaved && !(await ensureCanProceed(leaving))) return;

      clearTabNavigation(leavingId);

      const retainIds = new Set(retainBinaryTabIdsRef?.current ?? []);
      setTabs((prev) =>
        prev.map((t) => {
          if (
            t.id === activeTabIdRef.current &&
            activeTabIdRef.current !== tabId &&
            !retainIds.has(t.id)
          ) {
            return releaseTabBinaryPayload(t);
          }
          return t;
        }),
      );
      setActiveTabId(tabId);
    },
    [clearTabNavigation, ensureCanProceed],
  );

  const openPathInNewTab = useCallback(
    async (relativePath: string): Promise<string | null> => {
      const cfg = configRef.current;
      if (!cfg || isDirectoryPath(relativePath)) {
        return null;
      }

      const currentTabs = tabsRef.current;
      const existing = currentTabs.find((t) => t.relativePath === relativePath);
      if (existing) {
        return existing.id;
      }

      const base = {
        dirty: false,
        keybindingMode: cfg.editor.mode,
        viewMode: cfg.editor.default_view,
      } as const;

      try {
        const loaded = await loadFileIntoTab(relativePath, base);
        const id = newId();
        setTabs((prev) => [...prev, { ...loaded, id }]);
        return id;
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        pushStatusToast(`无法打开文件: ${message}`, 'error');
        return null;
      }
    },
    [],
  );

  const openPath = useCallback(async (relativePath: string) => {
    const cfg = configRef.current;
    if (!cfg || isDirectoryPath(relativePath)) {
      return;
    }

    const currentTabs = tabsRef.current;
    const existing = currentTabs.find((t) => t.relativePath === relativePath);
    if (existing) {
      await activateTabId(existing.id);
      return;
    }

    const targetId = resolveTargetTabId(currentTabs, activeTabIdRef.current);
    const target = targetId
      ? currentTabs.find((t) => t.id === targetId)
      : undefined;
    if (!(await ensureCanProceed(target))) return;

    const base = {
      dirty: false,
      keybindingMode: cfg.editor.mode,
      viewMode: cfg.editor.default_view,
    } as const;

    try {
      const loaded = await loadFileIntoTab(relativePath, base);
      let nextActiveId: string | null = null;

      setTabs((prev) => {
        const nextTargetId = resolveTargetTabId(prev, activeTabIdRef.current);
        if (!nextTargetId) {
          const id = newId();
          nextActiveId = id;
          return [{ ...loaded, id }];
        }
        nextActiveId = nextTargetId;
        return prev.map((t) => {
          if (t.id !== nextTargetId) return t;
          releaseTabResources(t);
          return { ...loaded, id: t.id };
        });
      });

      if (nextActiveId) setActiveTabId(nextActiveId);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      pushStatusToast(`无法打开文件: ${message}`, 'error');
    }
  }, [activateTabId, ensureCanProceed]);

  const openPathRef = useRef(openPath);
  openPathRef.current = openPath;

  const openPathInSplit = useCallback(
    async (
      relativePath: string,
      placement: SplitPlacement,
      split: EditorSplitLayout | null,
      onSplitChange: (layout: EditorSplitLayout) => void,
    ): Promise<void> => {
      const cfg = configRef.current;
      if (!cfg || isDirectoryPath(relativePath)) {
        return;
      }

      const currentId = activeTabIdRef.current;
      const currentTabs = tabsRef.current;
      const currentTab = currentId
        ? currentTabs.find((t) => t.id === currentId)
        : null;

      if (!currentTab) {
        await openPathRef.current(relativePath);
        return;
      }

      const newPane = splitPlacementNewPane(placement);
      const direction = splitPlacementDirection(placement);

      if (split) {
        const targetTabId = splitPaneTabId(split, newPane);
        const target = currentTabs.find((t) => t.id === targetTabId);
        if (!(await ensureCanProceed(target))) return;

        const existing = currentTabs.find((t) => t.relativePath === relativePath);
        if (existing) {
          onSplitChange({
            ...split,
            direction,
            primaryTabId:
              newPane === 'primary' ? existing.id : split.primaryTabId,
            secondaryTabId:
              newPane === 'secondary' ? existing.id : split.secondaryTabId,
            focusedPane: newPane,
          });
          setActiveTabId(existing.id);
          return;
        }

        const base = {
          dirty: false,
          keybindingMode: cfg.editor.mode,
          viewMode: cfg.editor.default_view,
        } as const;

        try {
          const loaded = await loadFileIntoTab(relativePath, base);
          setTabs((prev) =>
            prev.map((t) => {
              if (t.id !== targetTabId) return t;
              releaseTabResources(t);
              return { ...loaded, id: t.id };
            }),
          );
          onSplitChange({
            ...split,
            direction,
            primaryTabId:
              newPane === 'primary' ? targetTabId : split.primaryTabId,
            secondaryTabId:
              newPane === 'secondary' ? targetTabId : split.secondaryTabId,
            focusedPane: newPane,
          });
          setActiveTabId(targetTabId);
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          pushStatusToast(`无法打开文件: ${message}`, 'error');
        }
        return;
      }

      const existing = currentTabs.find((t) => t.relativePath === relativePath);
      let newTabId: string | null =
        existing && existing.id !== currentId ? existing.id : null;
      let createdPaneOnlyTab = false;
      if (!newTabId) {
        const cfg2 = configRef.current;
        if (!cfg2) return;
        const base = {
          dirty: false,
          keybindingMode: cfg2.editor.mode,
          viewMode: cfg2.editor.default_view,
        } as const;
        try {
          const loaded = await loadFileIntoTab(relativePath, base);
          const id = newId();
          setTabs((prev) => [...prev, { ...loaded, id }]);
          newTabId = id;
          createdPaneOnlyTab = true;
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          pushStatusToast(`无法打开文件: ${message}`, 'error');
          return;
        }
      }
      if (!newTabId || newTabId === currentId) return;

      const primaryTabId = newPane === 'primary' ? newTabId : currentId;
      const secondaryTabId = newPane === 'secondary' ? newTabId : currentId;

      onSplitChange({
        direction,
        ratio: 0.5,
        primaryTabId,
        secondaryTabId,
        focusedPane: newPane,
        paneOnlyTabIds: createdPaneOnlyTab ? [newTabId] : undefined,
      });
      setActiveTabId(createdPaneOnlyTab ? currentId : newTabId);
    },
    [ensureCanProceed, openPathInNewTab],
  );

  const openPathFromEditorLink = useCallback(
    async (relativePath: string) => {
      const tabId = activeTabIdRef.current;
      if (!tabId) return;

      const tab = tabsRef.current.find((t) => t.id === tabId);
      if (!tab || tab.kind !== 'markdown') {
        await openPathRef.current(relativePath);
        return;
      }

      if (tab.relativePath && tab.relativePath !== relativePath) {
        const stacks = getTabNavigationStacks(tabId);
        tabNavStacksRef.current.set(
          tabId,
          pushTabNavigationBack(stacks, tab.relativePath),
        );
        bumpTabNav();
      }

      await replaceTabWithPath(tabId, relativePath);
    },
    [bumpTabNav, getTabNavigationStacks, replaceTabWithPath],
  );

  const navigateTabBack = useCallback(async (tabIdOverride?: string) => {
    const tabId = tabIdOverride ?? activeTabIdRef.current;
    if (!tabId) return;

    const tab = tabsRef.current.find((t) => t.id === tabId);
    if (!tab?.relativePath) return;

    const stacks = getTabNavigationStacks(tabId);
    const { stacks: next, target } = tabNavigationGoBack(
      stacks,
      tab.relativePath,
    );
    if (!target) return;

    tabNavStacksRef.current.set(tabId, next);
    bumpTabNav();
    await replaceTabWithPath(tabId, target);
  }, [bumpTabNav, getTabNavigationStacks, replaceTabWithPath]);

  const navigateTabForward = useCallback(async (tabIdOverride?: string) => {
    const tabId = tabIdOverride ?? activeTabIdRef.current;
    if (!tabId) return;

    const tab = tabsRef.current.find((t) => t.id === tabId);
    if (!tab?.relativePath) return;

    const stacks = getTabNavigationStacks(tabId);
    const { stacks: next, target } = tabNavigationGoForward(
      stacks,
      tab.relativePath,
    );
    if (!target) return;

    tabNavStacksRef.current.set(tabId, next);
    bumpTabNav();
    await replaceTabWithPath(tabId, target);
  }, [bumpTabNav, getTabNavigationStacks, replaceTabWithPath]);

  const openPathWithReveal = useCallback(
    async (relativePath: string, reveal: EditorRevealTarget) => {
      const cfg = configRef.current;
      if (!cfg || isDirectoryPath(relativePath)) {
        return;
      }

      const currentTabs = tabsRef.current;
      const existing = currentTabs.find((t) => t.relativePath === relativePath);
      if (existing) {
        setTabs((prev) =>
          prev.map((t) =>
            t.id === existing.id
              ? {
                  ...t,
                  reveal,
                  ...(t.kind === 'markdown' || t.kind === 'html'
                    ? { viewMode: 'source' as const }
                    : {}),
                }
              : t,
          ),
        );
        await activateTabId(existing.id);
        return;
      }

      const targetId = resolveTargetTabId(currentTabs, activeTabIdRef.current);
      const target = targetId
        ? currentTabs.find((t) => t.id === targetId)
        : undefined;
      if (!(await ensureCanProceed(target))) return;

      const base = {
        dirty: false,
        keybindingMode: cfg.editor.mode,
        viewMode: cfg.editor.default_view,
      } as const;

      try {
        const loaded = await loadFileIntoTab(relativePath, base);
        const withReveal = {
          ...loaded,
          reveal,
          ...(loaded.kind === 'markdown' || loaded.kind === 'html'
            ? { viewMode: 'source' as const }
            : {}),
        };

        let nextActiveId: string | null = null;
        setTabs((prev) => {
          const nextTargetId = resolveTargetTabId(prev, activeTabIdRef.current);
          if (!nextTargetId) {
            const id = newId();
            nextActiveId = id;
            return [{ ...withReveal, id }];
          }
          nextActiveId = nextTargetId;
          return prev.map((t) => {
            if (t.id !== nextTargetId) return t;
            releaseTabResources(t);
            return { ...withReveal, id: t.id };
          });
        });

        if (nextActiveId) setActiveTabId(nextActiveId);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        pushStatusToast(`无法打开文件: ${message}`, 'error');
      }
    },
    [activateTabId, ensureCanProceed],
  );

  const openDirectoryGrid = useCallback(
    async (relativePath: string) => {
      const cfg = configRef.current;
      if (
        !cfg ||
        !(relativePath === '' || isDirectoryPath(relativePath))
      ) {
        return;
      }

      const currentTabs = tabsRef.current;
      const existing = currentTabs.find(
        (t) => t.kind === 'directory-grid' && t.relativePath === relativePath,
      );
      if (existing) {
        await activateTabId(existing.id);
        return;
      }

      const targetId = resolveTargetTabId(currentTabs, activeTabIdRef.current);
      const target = targetId
        ? currentTabs.find((t) => t.id === targetId)
        : undefined;
      if (!(await ensureCanProceed(target))) return;

      const loaded: EditorTab = {
        id: newId(),
        relativePath,
        kind: 'directory-grid',
        dirty: false,
        keybindingMode: cfg.editor.mode,
        viewMode: cfg.editor.default_view,
        content: '',
        truncated: false,
        fileSize: 0,
      };

      let nextActiveId: string | null = null;
      setTabs((prev) => {
        const nextTargetId = resolveTargetTabId(prev, activeTabIdRef.current);
        if (!nextTargetId) {
          const id = newId();
          nextActiveId = id;
          return [{ ...loaded, id }];
        }
        nextActiveId = nextTargetId;
        return prev.map((t) => {
          if (t.id !== nextTargetId) return t;
          releaseTabResources(t);
          return { ...loaded, id: t.id };
        });
      });

      if (nextActiveId) setActiveTabId(nextActiveId);
    },
    [activateTabId, ensureCanProceed],
  );

  const addTab = useCallback(() => {
    if (!config) return;
    const tab = createEmptyTab(config);
    setTabs((prev) => [...prev, tab]);
    setActiveTabId(tab.id);
  }, [config]);

  const closeTab = useCallback(
    async (tabId: string) => {
      const target = tabsRef.current.find((t) => t.id === tabId);
      if (!target) return;
      if (!(await ensureCanProceed(target))) return;

      clearTabNavigation(tabId);
      releaseTabResources(target);

      setTabs((prev) => {
        const nextTabs = prev.filter((t) => t.id !== tabId);
        let finalTabs = nextTabs;
        let freshTab: EditorTab | null = null;

        if (nextTabs.length === 0 && configRef.current) {
          freshTab = createEmptyTab(configRef.current);
          finalTabs = [freshTab];
        }

        setActiveTabId((currentActive) =>
          resolveActiveAfterClose(
            prev,
            tabId,
            currentActive,
            finalTabs,
            freshTab,
          ),
        );

        return finalTabs;
      });
    },
    [clearTabNavigation, ensureCanProceed],
  );

  const setActiveTab = useCallback(
    (tabId: string) => {
      activateTabId(tabId).catch(() => undefined);
    },
    [activateTabId],
  );

  /** 分屏内切换焦点：两侧标签仍可见，不提示未保存 */
  const setActiveTabInSplit = useCallback(
    (tabId: string) => {
      activateTabId(tabId, { checkUnsaved: false }).catch(() => undefined);
    },
    [activateTabId],
  );

  useEffect(() => {
    if (!activeTab || !needsBinaryHydration(activeTab)) return undefined;

    const tabId = activeTab.id;
    const relativePath = activeTab.relativePath;
    if (!relativePath) return undefined;

    let cancelled = false;

    (async () => {
      try {
        const { base64, mime } =
          await window.muled.file.readBinary(relativePath);
        if (cancelled) return;
        const dataUrl = `data:${mime};base64,${base64}`;
        setTabs((prev) =>
          prev.map((t) => {
            if (t.id !== tabId) return t;
            if (t.kind === 'pdf') return { ...t, pdfSrc: dataUrl };
            if (t.kind === 'image') return { ...t, imageSrc: dataUrl };
            if (t.kind === 'audio') return { ...t, audioSrc: dataUrl };
            return t;
          }),
        );
      } catch (e) {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : String(e);
        pushStatusToast(`无法加载预览: ${message}`, 'error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    activeTab?.id,
    activeTab?.kind,
    activeTab?.relativePath,
    activeTab?.pdfSrc,
    activeTab?.imageSrc,
    activeTab?.audioSrc,
  ]);

  const updateActiveContent = useCallback(
    (content: string) => {
      if (!activeTabId) return;
      setTabs((prev) =>
        prev.map((t) => {
          if (t.id !== activeTabId) return t;
          if (t.content === content) return t;
          return { ...t, content, dirty: true };
        }),
      );
    },
    [activeTabId],
  );

  const updateTabContent = useCallback((tabId: string, content: string) => {
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id !== tabId) return t;
        if (t.content === content) return t;
        return { ...t, content, dirty: true };
      }),
    );
  }, []);

  const setViewMode = useCallback(
    (tabId: string, viewMode: EditorViewMode, content?: string) => {
      setTabs((prev) =>
        prev.map((t) => {
          if (t.id !== tabId) return t;
          return {
            ...t,
            viewMode,
            ...(content !== undefined ? { content } : {}),
          };
        }),
      );
    },
    [],
  );

  const setKeybindingMode = useCallback((tabId: string, mode: EditorMode) => {
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id !== tabId) return t;
        return { ...t, ...keybindingModePatch(t.viewMode, mode) };
      }),
    );
  }, []);

  const initFromConfig = useCallback((nextConfig: PublicConfig) => {
    const tab = createEmptyTab(nextConfig);
    setTabs((prev) => {
      prev.forEach((t) => releaseTabResources(t));
      return [tab];
    });
    setActiveTabId(tab.id);
  }, []);

  return {
    tabs,
    activeTab,
    activeTabId,
    openPath,
    openPathInSplit,
    openPathFromEditorLink,
    getTabNavigation,
    openPathWithReveal,
    openDirectoryGrid,
    tabNavigation,
    navigateTabBack,
    navigateTabForward,
    addTab,
    closeTab,
    setActiveTab,
    setActiveTabInSplit,
    ensureCanProceed,
    updateActiveContent,
    updateTabContent,
    setViewMode,
    setKeybindingMode,
    saveTab,
    initFromConfig,
  };
}

export type { TabKind };
