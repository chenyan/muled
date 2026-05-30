import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  EditorMode,
  EditorViewMode,
  PublicConfig,
} from '../../shared/types/config';
import { isMarkdownPath } from '../lib/fileLanguage';
import { exportWikiImagesFromMarkdown } from '../lib/normalizeMarkdownWikiImages';
import { isDirectoryPath, isImagePath, isPdfPath } from '../lib/mime';
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
import type { EditorTab, EditorRevealTarget, TabKind } from '../types/tab';

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

  const file = await window.muled.file.read(relativePath);
  const markdown = isMarkdownPath(relativePath);
  const content = markdown
    ? exportWikiImagesFromMarkdown(file.content)
    : file.content;
  return {
    ...base,
    id: newId(),
    relativePath,
    kind: markdown ? 'markdown' : 'text',
    viewMode: markdown ? 'rich-text' : 'source',
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
  options?: { confirmUnsaved?: ConfirmUnsavedChanges },
) {
  const confirmUnsaved = options?.confirmUnsaved;
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
    if (tab.kind === 'image' || tab.kind === 'pdf') {
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

  const activateTabId = useCallback(
    async (tabId: string) => {
      if (tabId === activeTabIdRef.current) return;

      const leaving = tabsRef.current.find(
        (t) => t.id === activeTabIdRef.current,
      );
      if (!(await ensureCanProceed(leaving))) return;

      setTabs((prev) =>
        prev.map((t) => {
          if (
            t.id === activeTabIdRef.current &&
            activeTabIdRef.current !== tabId
          ) {
            return releaseTabBinaryPayload(t);
          }
          return t;
        }),
      );
      setActiveTabId(tabId);
    },
    [ensureCanProceed],
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
                  ...(t.kind === 'markdown'
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
          ...(loaded.kind === 'markdown' ? { viewMode: 'source' as const } : {}),
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
    [ensureCanProceed],
  );

  const setActiveTab = useCallback(
    (tabId: string) => {
      activateTabId(tabId).catch(() => undefined);
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

  /** WYSIWYG 载入完成后同步编辑器 baseline，不标记 dirty（AutoLink 等被动改写） */
  const syncActiveContent = useCallback(
    (content: string) => {
      if (!activeTabId) return;
      setTabs((prev) =>
        prev.map((t) => {
          if (t.id !== activeTabId) return t;
          if (t.dirty || t.content === content) return t;
          return { ...t, content };
        }),
      );
    },
    [activeTabId],
  );

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
    openPathWithReveal,
    addTab,
    closeTab,
    setActiveTab,
    updateActiveContent,
    updateTabContent,
    syncActiveContent,
    setViewMode,
    setKeybindingMode,
    saveTab,
    initFromConfig,
  };
}

export type { TabKind };
