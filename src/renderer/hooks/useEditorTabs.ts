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
import { isHtmlPath, isMarkdownPath, isP5Path, isStrudelPath } from '../lib/fileLanguage';
import { isMnotePath } from '../lib/mnotePath';
import { arrayBufferToBase64, arrayBufferToDataUrl } from '../lib/dataUrl';
import { getDocxEditorBuffer } from '../lib/editorDocxBridge';
import { getXlsxEditorBuffer } from '../lib/editorXlsxBridge';
import { exportWikiImagesFromMarkdown } from '../lib/normalizeMarkdownWikiImages';
import {
  isAudioPath,
  isCsvPath,
  isDirectoryPath,
  isDocxPath,
  isDuckdbPath,
  isImagePath,
  isIpynbPath,
  isPdfPath,
  isPptxPath,
  isSqlitePath,
  isVideoPath,
  isXlsxPath,
} from '../lib/mime';
import keybindingModePatch from '../lib/keybindingMode';
import { getEditorOutlineHandlers } from '../lib/editorOutlineBridge';
import { getEditorViewContent } from '../lib/editorViewBridge';
import { pushStatusToast } from '../lib/statusToast';
import { pdfBufferFromBytes } from '../lib/pdfBuffer';
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
import type { MnoteEntry } from '../lib/mnoteFormat';
import { companionMnotePath } from '../lib/mnotePath';
import { resolveMnoteReveal } from '../lib/mnoteRelocate';
import { normalizeDirectoryPath } from '../lib/workspaceTreeFileOps';
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
    | 'pdfBuffer'
    | 'audioSrc'
    | 'videoSrc'
    | 'docxSrc'
    | 'pptxSrc'
    | 'xlsxSrc'
  >,
): Promise<EditorTab> {
  if (isPptxPath(relativePath)) {
    const { base64, mime } = await window.muled.file.readBinary(relativePath);
    return {
      ...base,
      id: newId(),
      relativePath,
      kind: 'pptx',
      content: '',
      truncated: false,
      fileSize: 0,
      pptxSrc: `data:${mime};base64,${base64}`,
      dirty: false,
    };
  }

  if (isDocxPath(relativePath)) {
    const { base64, mime } = await window.muled.file.readBinary(relativePath);
    return {
      ...base,
      id: newId(),
      relativePath,
      kind: 'docx',
      viewMode: 'rich-text',
      content: '',
      truncated: false,
      fileSize: 0,
      docxSrc: `data:${mime};base64,${base64}`,
      dirty: false,
    };
  }

  if (isPdfPath(relativePath)) {
    const { data } = await window.muled.file.readBinaryBuffer(relativePath);
    return {
      ...base,
      id: newId(),
      relativePath,
      kind: 'pdf',
      content: '',
      truncated: false,
      fileSize: 0,
      pdfBuffer: pdfBufferFromBytes(data),
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

  if (isVideoPath(relativePath)) {
    const { base64, mime } = await window.muled.file.readBinary(relativePath);
    return {
      ...base,
      id: newId(),
      relativePath,
      kind: 'video',
      content: '',
      truncated: false,
      fileSize: 0,
      videoSrc: `data:${mime};base64,${base64}`,
      dirty: false,
    };
  }

  if (isXlsxPath(relativePath)) {
    const { base64, mime } = await window.muled.file.readBinary(relativePath);
    return {
      ...base,
      id: newId(),
      relativePath,
      kind: 'xlsx',
      viewMode: 'preview',
      content: '',
      truncated: false,
      fileSize: 0,
      xlsxSrc: `data:${mime};base64,${base64}`,
      dirty: false,
    };
  }

  if (isSqlitePath(relativePath)) {
    return {
      ...base,
      id: newId(),
      relativePath,
      kind: 'sqlite3',
      viewMode: 'preview',
      content: '',
      truncated: false,
      fileSize: 0,
      dirty: false,
    };
  }

  if (isDuckdbPath(relativePath)) {
    return {
      ...base,
      id: newId(),
      relativePath,
      kind: 'duckdb',
      viewMode: 'preview',
      content: '',
      truncated: false,
      fileSize: 0,
      dirty: false,
    };
  }

  const file = await window.muled.file.read(relativePath);
  const csv = isCsvPath(relativePath);
  const ipynb = isIpynbPath(relativePath);
  const mnote = isMnotePath(relativePath);
  const markdown = isMarkdownPath(relativePath);
  const html = isHtmlPath(relativePath);
  const strudel = isStrudelPath(relativePath);
  const p5 = isP5Path(relativePath);
  const content = markdown
    ? exportWikiImagesFromMarkdown(file.content)
    : file.content;
  const kind: TabKind = mnote
    ? 'mnote'
    : csv
      ? 'csv'
      : ipynb
        ? 'ipynb'
        : strudel
          ? 'strudel'
          : p5
            ? 'p5'
            : markdown
              ? 'markdown'
              : html
                ? 'html'
                : 'text';
  const viewMode: EditorViewMode =
    mnote
      ? 'rich-text'
      : csv || ipynb || html || strudel || p5
        ? 'preview'
        : markdown
          ? 'rich-text'
          : 'source';
  return {
    ...base,
    id: newId(),
    relativePath,
    kind,
    viewMode,
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
    /** 分屏等仍渲染在界面上的标签，切换焦点时不释放 pdfBuffer/imageSrc */
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
      const supportsNavigation =
        tab?.kind === 'markdown' ||
        (tab?.kind === 'html' && tab.viewMode === 'preview');
      if (!tab || !supportsNavigation) {
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
    if (
      tab.kind === 'image' ||
      tab.kind === 'pdf' ||
      tab.kind === 'audio' ||
      tab.kind === 'video' ||
      tab.kind === 'pptx'
    ) {
      return { ok: false, reason: 'image' };
    }

    if (tab.kind === 'docx') {
      const buffer = await getDocxEditorBuffer(tabId);
      if (!buffer) {
        return { ok: false, reason: 'not_found' };
      }
      const mime =
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      await window.muled.file.writeBinary(
        tab.relativePath,
        arrayBufferToBase64(buffer),
      );
      setTabs((prev) =>
        prev.map((t) =>
          t.id === tabId
            ? {
                ...t,
                dirty: false,
                docxSrc: arrayBufferToDataUrl(buffer, mime),
              }
            : t,
        ),
      );
      return { ok: true };
    }

    if (tab.kind === 'xlsx') {
      const buffer = await getXlsxEditorBuffer(tabId);
      if (!buffer) {
        return { ok: false, reason: 'not_found' };
      }
      const mime =
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      await window.muled.file.writeBinary(
        tab.relativePath,
        arrayBufferToBase64(buffer),
      );
      setTabs((prev) =>
        prev.map((t) =>
          t.id === tabId
            ? {
                ...t,
                dirty: false,
                xlsxSrc: arrayBufferToDataUrl(buffer, mime),
              }
            : t,
        ),
      );
      return { ok: true };
    }

    const contentToSave = getEditorViewContent(tabId) ?? tab.content;
    await window.muled.file.write(tab.relativePath, contentToSave);
    setTabs((prev) =>
      prev.map((t) =>
        t.id === tabId ? { ...t, content: contentToSave, dirty: false } : t,
      ),
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
    async (
      tabId: string,
      relativePath: string,
      options?: { htmlPreviewHash?: string },
    ) => {
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
          target.kind === 'markdown' ||
          target.kind === 'html' ||
          target.kind === 'docx' ||
          target.kind === 'csv' ||
          target.kind === 'ipynb' ||
          target.kind === 'strudel' ||
          target.kind === 'p5'
            ? target.viewMode
            : cfg.editor.default_view,
      } as const;

      try {
        const loaded = await loadFileIntoTab(relativePath, base);
        setTabs((prev) =>
          prev.map((t) => {
            if (t.id !== tabId) return t;
            releaseTabResources(t);
            return {
              ...loaded,
              id: tabId,
              htmlPreviewHash: options?.htmlPreviewHash,
            };
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
        await activateTabId(existing.id);
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
        setActiveTabId(id);
        return id;
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        pushStatusToast(`无法打开文件: ${message}`, 'error');
        return null;
      }
    },
    [activateTabId],
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

  const navigateHtmlPreviewToPath = useCallback(
    async (readPath: string, hash?: string) => {
      const tabId = activeTabIdRef.current;
      if (!tabId) return;

      const tab = tabsRef.current.find((t) => t.id === tabId);
      if (!tab || tab.kind !== 'html' || tab.viewMode !== 'preview') {
        return;
      }

      if (tab.relativePath && tab.relativePath !== readPath) {
        const stacks = getTabNavigationStacks(tabId);
        tabNavStacksRef.current.set(
          tabId,
          pushTabNavigationBack(stacks, tab.relativePath),
        );
        bumpTabNav();
      }

      await replaceTabWithPath(tabId, readPath, {
        htmlPreviewHash: hash || undefined,
      });
    },
    [bumpTabNav, getTabNavigationStacks, replaceTabWithPath],
  );

  const clearHtmlPreviewHash = useCallback((tabId: string) => {
    setTabs((prev) =>
      prev.map((t) =>
        t.id === tabId ? { ...t, htmlPreviewHash: undefined } : t,
      ),
    );
  }, []);

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
                  ...(t.kind === 'markdown' ||
                  t.kind === 'html' ||
                  t.kind === 'ipynb' ||
                  t.kind === 'strudel' ||
                  t.kind === 'p5'
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
          ...(loaded.kind === 'markdown' ||
          loaded.kind === 'html' ||
          loaded.kind === 'ipynb' ||
          loaded.kind === 'strudel' ||
          loaded.kind === 'p5'
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

  const revealMnoteEntryOnTab = useCallback(
    (tabId: string, entry: MnoteEntry, sourceContent: string) => {
      const resolved = resolveMnoteReveal(entry, sourceContent);
      if (!resolved) return;

      const tab = tabsRef.current.find((t) => t.id === tabId);
      if (!tab) return;

      if (
        tab.kind === 'markdown' &&
        tab.viewMode === 'rich-text' &&
        resolved.editorReveal
      ) {
        const title =
          entry.quote?.split('\n')[0]?.trim() ??
          (resolved.parsed.type === 'md' ? (resolved.parsed.heading ?? '') : '');
        const revealed = getEditorOutlineHandlers(tabId)?.revealOutlineTarget({
          line: resolved.editorReveal.line,
          title,
        });
        if (revealed) return;
      }

      setTabs((prev) =>
        prev.map((t) => {
          if (t.id !== tabId) return t;

          if (t.kind === 'pdf' && resolved.pdfReveal) {
            return { ...t, pdfReveal: resolved.pdfReveal };
          }

          if (t.kind === 'markdown' && resolved.editorReveal) {
            return {
              ...t,
              reveal: resolved.editorReveal,
              viewMode: 'source' as const,
            };
          }

          return t;
        }),
      );
    },
    [],
  );

  const remapTabsForPathRename = useCallback((from: string, to: string) => {
    const fromDir = from.endsWith('/') ? normalizeDirectoryPath(from) : null;
    const toDir = to.endsWith('/') ? normalizeDirectoryPath(to) : null;

    setTabs((prev) =>
      prev.map((tab) => {
        if (!tab.relativePath) return tab;

        let nextPath = tab.relativePath;

        if (fromDir && toDir) {
          if (tab.relativePath.startsWith(fromDir)) {
            nextPath = `${toDir}${tab.relativePath.slice(fromDir.length)}`;
          }
        } else if (!from.endsWith('/') && !to.endsWith('/')) {
          if (tab.relativePath === from) {
            nextPath = to;
          } else if (tab.relativePath === companionMnotePath(from)) {
            nextPath = companionMnotePath(to);
          }
        }

        return nextPath === tab.relativePath
          ? tab
          : { ...tab, relativePath: nextPath };
      }),
    );
  }, []);

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

  const closeTabsForDeletedPath = useCallback(
    async (deletedPath: string): Promise<boolean> => {
      const matchesDeletedPath = (tab: EditorTab): boolean => {
        if (!tab.relativePath) {
          return false;
        }
        if (deletedPath.endsWith('/')) {
          return (
            tab.relativePath === deletedPath ||
            tab.relativePath.startsWith(deletedPath)
          );
        }
        return tab.relativePath === deletedPath;
      };

      const affected = tabsRef.current.filter(matchesDeletedPath);
      for (const tab of affected) {
        if (!(await ensureCanProceed(tab))) {
          return false;
        }
      }
      for (const tab of affected) {
        await closeTab(tab.id);
      }
      return true;
    },
    [closeTab, ensureCanProceed],
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

  const binaryHydrationSig = useMemo(() => {
    const retainIds = new Set(retainBinaryTabIdsRef?.current ?? []);
    return tabs
      .filter(
        (t) =>
          needsBinaryHydration(t) &&
          t.relativePath &&
          (t.id === activeTabId || retainIds.has(t.id)),
      )
      .map((t) => `${t.id}\0${t.kind}\0${t.relativePath}`)
      .join('\n');
  }, [activeTabId, tabs]);

  useEffect(() => {
    if (!binaryHydrationSig) return undefined;

    const retainIds = new Set(retainBinaryTabIdsRef?.current ?? []);
    const hydrateTargets = tabs.filter(
      (t) =>
        needsBinaryHydration(t) &&
        t.relativePath &&
        (t.id === activeTabId || retainIds.has(t.id)),
    );
    if (hydrateTargets.length === 0) return undefined;

    let cancelled = false;

    for (const target of hydrateTargets) {
      const tabId = target.id;
      const relativePath = target.relativePath!;
      void (async () => {
        try {
          if (target.kind === 'pdf') {
            const { data } =
              await window.muled.file.readBinaryBuffer(relativePath);
            if (cancelled) return;
            const pdfBuffer = pdfBufferFromBytes(data);
            setTabs((prev) =>
              prev.map((t) =>
                t.id === tabId ? { ...t, pdfBuffer } : t,
              ),
            );
            return;
          }

          const { base64, mime } =
            await window.muled.file.readBinary(relativePath);
          if (cancelled) return;
          const dataUrl = `data:${mime};base64,${base64}`;
          setTabs((prev) =>
            prev.map((t) => {
              if (t.id !== tabId) return t;
              if (t.kind === 'image') return { ...t, imageSrc: dataUrl };
              if (t.kind === 'audio') return { ...t, audioSrc: dataUrl };
              if (t.kind === 'video') return { ...t, videoSrc: dataUrl };
              if (t.kind === 'docx') return { ...t, docxSrc: dataUrl };
              if (t.kind === 'pptx') return { ...t, pptxSrc: dataUrl };
              if (t.kind === 'xlsx') return { ...t, xlsxSrc: dataUrl };
              return t;
            }),
          );
        } catch (e) {
          if (cancelled) return;
          const message = e instanceof Error ? e.message : String(e);
          pushStatusToast(`无法加载预览: ${message}`, 'error');
        }
      })();
    }

    return () => {
      cancelled = true;
    };
  }, [activeTabId, binaryHydrationSig, tabs]);

  const markTabDirty = useCallback((tabId: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === tabId && !t.dirty ? { ...t, dirty: true } : t)),
    );
  }, []);

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

  const setPdfLastPage = useCallback((tabId: string, page: number) => {
    if (!Number.isFinite(page) || page < 1) return;
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id !== tabId || t.pdfLastPage === page) return t;
        return { ...t, pdfLastPage: page };
      }),
    );
  }, []);

  const clearMnoteRevealOnTab = useCallback((tabId: string) => {
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id !== tabId) return t;
        if (!t.reveal && !t.pdfReveal) return t;
        return { ...t, reveal: undefined, pdfReveal: undefined };
      }),
    );
  }, []);

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
    openPathInNewTab,
    openPathInSplit,
    openPathFromEditorLink,
    getTabNavigation,
    openPathWithReveal,
    revealMnoteEntryOnTab,
    remapTabsForPathRename,
    openDirectoryGrid,
    tabNavigation,
    navigateTabBack,
    navigateTabForward,
    navigateHtmlPreviewToPath,
    clearHtmlPreviewHash,
    addTab,
    closeTab,
    closeTabsForDeletedPath,
    setActiveTab,
    setActiveTabInSplit,
    ensureCanProceed,
    updateActiveContent,
    updateTabContent,
    setPdfLastPage,
    clearMnoteRevealOnTab,
    setViewMode,
    setKeybindingMode,
    saveTab,
    markTabDirty,
    initFromConfig,
  };
}

export type { TabKind };
