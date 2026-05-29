import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  EditorMode,
  EditorViewMode,
  PublicConfig,
} from '../../shared/types/config';
import { isMarkdownPath } from '../lib/fileLanguage';
import { exportWikiImagesFromMarkdown } from '../lib/normalizeMarkdownWikiImages';
import { isDirectoryPath, isImagePath } from '../lib/mime';
import keybindingModePatch from '../lib/keybindingMode';
import { pushStatusToast } from '../lib/statusToast';
import { newId } from '../../shared/id';
import type { EditorTab, TabKind } from '../types/tab';

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
  >,
): Promise<EditorTab> {
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

export function useEditorTabs(config: PublicConfig | null) {
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

  useEffect(() => {
    if (tabs.length === 0) {
      if (activeTabId !== null) setActiveTabId(null);
      return;
    }
    if (!activeTabId || !tabs.some((t) => t.id === activeTabId)) {
      setActiveTabId(resolveTargetTabId(tabs, activeTabId));
    }
  }, [tabs, activeTabId]);

  const openPath = useCallback(
    async (relativePath: string) => {
      if (!config || isDirectoryPath(relativePath)) {
        return;
      }

      let openedExistingId: string | null = null;
      setTabs((prev) => {
        const existing = prev.find((t) => t.relativePath === relativePath);
        if (existing) openedExistingId = existing.id;
        return prev;
      });
      if (openedExistingId) {
        setActiveTabId(openedExistingId);
        return;
      }

      const base = {
        dirty: false,
        keybindingMode: config.editor.mode,
        viewMode: config.editor.default_view,
      } as const;

      try {
        const loaded = await loadFileIntoTab(relativePath, base);
        let nextActiveId: string | null = null;

        setTabs((prev) => {
          const targetId = resolveTargetTabId(prev, activeTabId);
          if (!targetId) {
            const id = newId();
            nextActiveId = id;
            return [{ ...loaded, id }];
          }
          nextActiveId = targetId;
          return prev.map((t) =>
            t.id === targetId ? { ...loaded, id: t.id } : t,
          );
        });

        if (nextActiveId) setActiveTabId(nextActiveId);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        pushStatusToast(`无法打开文件: ${message}`, 'error');
      }
    },
    [config, activeTabId],
  );

  const addTab = useCallback(() => {
    if (!config) return;
    const tab = createEmptyTab(config);
    setTabs((prev) => [...prev, tab]);
    setActiveTabId(tab.id);
  }, [config]);

  const closeTab = useCallback(
    (tabId: string) => {
      setTabs((prev) => {
        const target = prev.find((t) => t.id === tabId);
        if (!target) return prev;

        if (target.dirty) {
          // eslint-disable-next-line no-alert
          const ok = window.confirm(
            `关闭「${target.relativePath ?? 'Untitled'}」？未保存的更改将丢失。`,
          );
          if (!ok) return prev;
        }

        const nextTabs = prev.filter((t) => t.id !== tabId);
        let finalTabs = nextTabs;
        let freshTab: EditorTab | null = null;

        if (nextTabs.length === 0 && config) {
          freshTab = createEmptyTab(config);
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
    [config],
  );

  const setActiveTab = useCallback((tabId: string) => {
    setActiveTabId(tabId);
  }, []);

  const updateActiveContent = useCallback(
    (content: string) => {
      if (!activeTabId) return;
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId ? { ...t, content, dirty: true } : t,
        ),
      );
    },
    [activeTabId],
  );

  const updateTabContent = useCallback((tabId: string, content: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, content, dirty: true } : t)),
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

  const saveTab = useCallback(
    async (tabId: string) => {
      const tab = tabs.find((t) => t.id === tabId);
      if (!tab) return { ok: false as const, reason: 'not_found' };
      if (!tab.relativePath) {
        return { ok: false as const, reason: 'no_path' };
      }
      if (tab.truncated) {
        return { ok: false as const, reason: 'truncated' };
      }
      if (tab.kind === 'image') {
        return { ok: false as const, reason: 'image' };
      }

      await window.muled.file.write(tab.relativePath, tab.content);
      setTabs((prev) =>
        prev.map((t) => (t.id === tabId ? { ...t, dirty: false } : t)),
      );
      return { ok: true as const };
    },
    [tabs],
  );

  const initFromConfig = useCallback((nextConfig: PublicConfig) => {
    const tab = createEmptyTab(nextConfig);
    setTabs([tab]);
    setActiveTabId(tab.id);
  }, []);

  return {
    tabs,
    activeTab,
    activeTabId,
    openPath,
    addTab,
    closeTab,
    setActiveTab,
    updateActiveContent,
    updateTabContent,
    setViewMode,
    setKeybindingMode,
    saveTab,
    initFromConfig,
  };
}

export type { TabKind };
