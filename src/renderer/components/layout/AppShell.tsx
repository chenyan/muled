import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import type { AiApplyMode } from '../../../shared/buildAiPrompt';
import { EditorIndentProvider } from '../../hooks/useEditorIndentSettings';
import { DEFAULT_PUBLIC_CONFIG } from '../../../shared/defaultPublicConfig';
import type { PublicConfig } from '../../../shared/types/config';
import type { SettingsForm } from '../../../shared/types/settings';
import type { ShellSearchMatch } from '../../../shared/types/search';
import { newId } from '../../../shared/id';
import PromptDialog from '../ai/PromptDialog';
import SettingsDialog from '../dialog/SettingsDialog';
import UnsavedChangesDialog from '../dialog/UnsavedChangesDialog';
import CommandPalette from '../command/CommandPalette';
import { useEditorTabs } from '../../hooks/useEditorTabs';
import { useUnsavedChangesDialog } from '../../hooks/useUnsavedChangesDialog';
import { useWorkspace } from '../../hooks/useWorkspace';
import { registerCommandPaletteOpen } from '../../lib/commandPaletteBridge';
import {
  getEditorAiHandlers,
  type EditorAiSnapshot,
} from '../../lib/editorAiBridge';
import { appendTextAtDocumentEnd } from '../../lib/appendTextAtDocumentEnd';
import {
  appendTextToEditorTab,
  getEditorContentForViewSwitch,
  getEditorViewContent,
} from '../../lib/editorViewBridge';
import {
  editorViewModeLabel,
  nextViewModeForTab,
} from '../../lib/editorViewMode';
import { getActiveEditorSelection } from '../../lib/editorSelectionBridge';
import { runPaletteCommand } from '../../lib/runPaletteCommand';
import { getCdPaletteCompletion } from '../../../shared/paletteAutoCompletion';
import { pushStatusToast } from '../../lib/statusToast';
import { appendMnoteEntry } from '../../lib/mnoteService';
import { companionMnotePath } from '../../lib/mnotePath';
import { parseMnoteDocument, type MnoteEntry } from '../../lib/mnoteFormat';
import {
  resolveMnoteQuoteEditorHighlight,
  resolveMnoteQuotePdfHighlightsForPage,
} from '../../lib/mnoteRelocate';
import { resolveMnoteSplitPair } from '../../lib/mnoteSplitPair';
import { handleWorkspacePathRenamed as syncMnoteOnWorkspacePathRenamed } from '../../lib/mnoteCompanionSync';
import { isEditableTextTab, type EditorTab } from '../../types/tab';
import TabBar from '../tabs/TabBar';
import PdfEngineProvider from '../editor/pdf/PdfEngineProvider';
import TabContent from '../tabs/TabContent';
import type { WorkspaceTreeRevealRequest } from '../tree/WorkspaceTree';
import SidebarTabs from '../sidebar/SidebarTabs';
import StatusBar from './StatusBar';
import StatusToast from './StatusToast';
import './AppShell.css';
import '../../theme/acmeTheme.css';
import { buildTabOutline } from '../../lib/outlineIndex';
import type { PdfOutlineItem } from '../../../shared/types/ipc';
import { getEditorOutlineHandlers } from '../../lib/editorOutlineBridge';
import {
  splitPaneTabId,
  splitSurvivorPane,
  tabBarActiveTabId,
  tabsForTabBar,
  type SplitPaneId,
  type SplitPlacement,
} from '../../../shared/editorSplit';
import { clampSidebarWidth } from '../../../shared/sidebarLayout';
import { useEditorSplit } from '../../hooks/useEditorSplit';
import { useSidebarResize } from '../../hooks/useSidebarResize';
import EditorSplitView from './EditorSplitView';

export default function AppShell() {
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const workspace = useWorkspace();
  const unsavedDialog = useUnsavedChangesDialog();
  const retainBinaryTabIdsRef = useRef<readonly string[]>([]);
  const editor = useEditorTabs(config, {
    confirmUnsaved: unsavedDialog.confirmUnsaved,
    retainBinaryTabIdsRef,
  });
  const {
    split,
    assignSplit,
    clearSplit,
    setSplitRatio,
    focusSplitPane,
    getSurvivorTabIdAfterClosePane,
  } = useEditorSplit(editor.tabs);
  retainBinaryTabIdsRef.current = split
    ? [split.primaryTabId, split.secondaryTabId]
    : [];
  const prevSplitRef = useRef<typeof split>(null);
  const tabBarTabs = useMemo(
    () => tabsForTabBar(editor.tabs, split),
    [editor.tabs, split],
  );
  const tabBarActiveId = useMemo(
    () => tabBarActiveTabId(editor.activeTabId, split),
    [editor.activeTabId, split],
  );

  useEffect(() => {
    const prev = prevSplitRef.current;
    if (prev && !split) {
      const keepId = editor.activeTabId;
      for (const id of prev.paneOnlyTabIds ?? []) {
        if (id !== keepId && editor.tabs.some((t) => t.id === id)) {
          editor.closeTab(id).catch(() => undefined);
        }
      }
    }
    prevSplitRef.current = split;
  }, [editor.activeTabId, editor.tabs, editor, split]);
  const [treeSelectionResetKey, setTreeSelectionResetKey] = useState(0);
  const [treeRevealRequest, setTreeRevealRequest] =
    useState<WorkspaceTreeRevealRequest | null>(null);
  const resetTreeSelection = useCallback(() => {
    setTreeSelectionResetKey((key) => key + 1);
  }, []);
  const revealPathInTree = useCallback((treePath: string) => {
    setTreeRevealRequest({ treePath, nonce: Date.now() });
  }, []);

  const [splitCollapsePreserve, setSplitCollapsePreserve] = useState<{
    pane: SplitPaneId;
    tabId: string;
    direction: 'horizontal' | 'vertical';
  } | null>(null);

  const handleSwitchWorkspace = useCallback(
    async (targetPath: string) => {
      if (!config || targetPath === workspace.root || workspace.loading) {
        return;
      }
      try {
        await workspace.cd(targetPath);
        editor.initFromConfig(config);
        clearSplit();
        setSplitCollapsePreserve(null);
        resetTreeSelection();
        pushStatusToast(`工作区: ${targetPath}`, 'success');
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        pushStatusToast(`切换工作区失败: ${message}`, 'error');
      }
    },
    [clearSplit, config, editor, resetTreeSelection, workspace],
  );

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteInitialValue, setPaletteInitialValue] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(
    () => DEFAULT_PUBLIC_CONFIG.ui.sidebar_width,
  );
  const [pdfOutline, setPdfOutline] = useState<PdfOutlineItem[]>([]);

  const [aiDialog, setAiDialog] = useState<{
    mode: AiApplyMode;
    snapshot: EditorAiSnapshot;
  } | null>(null);

  const openCommandPalette = useCallback((options?: { prefix?: string }) => {
    setPaletteInitialValue(options?.prefix ?? '');
    setPaletteOpen(true);
  }, []);

  const closeCommandPalette = useCallback(() => {
    setPaletteOpen(false);
  }, []);

  const openAiDialog = useCallback(
    (mode: AiApplyMode, snapshot: EditorAiSnapshot) => {
      setAiDialog({ mode, snapshot });
    },
    [],
  );

  const closeAiDialog = useCallback(() => {
    setAiDialog(null);
  }, []);

  const handleAiSubmit = useCallback(
    async (prompt: string) => {
      const tab = editor.activeTab;
      if (!tab || !isEditableTextTab(tab) || tab.truncated) {
        return { ok: false as const, error: '当前标签页不可编辑' };
      }
      if (!aiDialog) {
        return { ok: false as const, error: '无 AI 会话' };
      }

      const handlers = getEditorAiHandlers(tab.id);
      if (!handlers) {
        return { ok: false as const, error: '编辑器未就绪' };
      }

      const result = await window.muled.ai.complete({
        prompt,
        selection: aiDialog.snapshot.selection.trim(),
      });

      if ('error' in result) {
        return { ok: false as const, error: result.error };
      }

      const applied = handlers.applyAiResult(
        aiDialog.snapshot,
        aiDialog.mode,
        result.text,
      );
      if (applied === null) {
        return {
          ok: false as const,
          error: '无法写回编辑器（选区可能已变化）',
        };
      }

      return { ok: true as const };
    },
    [aiDialog, editor.activeTab],
  );

  useEffect(() => {
    registerCommandPaletteOpen((options) => {
      openCommandPalette(options);
    });
    return () => registerCommandPaletteOpen(null);
  }, [openCommandPalette]);

  const resolvePaletteCompletion = useCallback(
    async (line: string, cycleIndex: number) => {
      if (!line.startsWith('cd ') || !window.muled?.workspace.completeCd) {
        return null;
      }
      const partial = line.slice(3);
      const { labels } = await window.muled.workspace.completeCd(partial);
      return getCdPaletteCompletion(line, labels, cycleIndex);
    },
    [],
  );

  const handleOpenSearchResult = useCallback(
    (match: ShellSearchMatch) => {
      if (match.kind === 'rg') {
        editor.openPathWithReveal(match.path, {
          id: newId(),
          line: match.line,
          column: match.column,
          length: match.length,
        }).catch(() => {
          /* toast in openPathWithReveal */
        });
        return;
      }
      editor.openPath(match.path).catch(() => {
        /* toast in openPath */
      });
    },
    [editor],
  );

  useEffect(() => {
    const tab = editor.activeTab;
    if (!tab || tab.kind !== 'pdf' || !tab.relativePath) {
      setPdfOutline([]);
      return;
    }
    let cancelled = false;
    window.muled.workspace
      .pdfOutline(tab.relativePath)
      .then((result) => {
        if (!cancelled) {
          setPdfOutline(result.items);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPdfOutline([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [editor.activeTab]);

  const outlineItems = useMemo(
    () => buildTabOutline(editor.activeTab, pdfOutline),
    [editor.activeTab, pdfOutline],
  );

  const notifySaveFailure = useCallback((reason: string) => {
    if (reason === 'truncated') {
      pushStatusToast('文件已截断，无法保存', 'error');
    } else if (reason === 'no_path') {
      pushStatusToast('请先打开文件再保存', 'error');
    } else {
      pushStatusToast('无法保存', 'error');
    }
  }, []);

  const handleSave = useCallback(
    async (tabId: string) => {
      const result = await editor.saveTab(tabId);
      if (result.ok) {
        pushStatusToast('已保存', 'success');
        return true;
      }
      notifySaveFailure(result.reason);
      return false;
    },
    [editor, notifySaveFailure],
  );

  const handlePaletteSubmit = useCallback(
    (input: string) => {
      const tab = editor.activeTab;
      const result = runPaletteCommand(input, {
        tabContent: tab && isEditableTextTab(tab) ? tab.content : '',
        selection:
          tab && isEditableTextTab(tab)
            ? getActiveEditorSelection(tab.id)
            : null,
      });

      if (!result.ok) {
        return { ok: false as const, error: result.error };
      }

      if (result.kind === 'cd') {
        handleSwitchWorkspace(result.path).catch(() => {
          /* toast in handleSwitchWorkspace */
        });
        return { ok: true as const };
      }

      if (result.kind === 'mode') {
        if (!tab || !isEditableTextTab(tab)) {
          return { ok: false as const, error: '当前标签页不可编辑' };
        }
        editor.setKeybindingMode(tab.id, result.mode);
        pushStatusToast(
          `键位: ${result.mode === 'vim' ? 'Vim' : 'Normal'}`,
          'info',
        );
        return { ok: true as const };
      }

      if (result.kind === 'save') {
        if (!editor.activeTabId) {
          return { ok: false as const, error: '没有打开的标签页' };
        }
        void handleSave(editor.activeTabId).catch((err) => {
          const message = err instanceof Error ? err.message : String(err);
          pushStatusToast(`保存失败: ${message}`, 'error');
        });
        return { ok: true as const };
      }

      if (result.kind === 'close') {
        if (!editor.activeTabId) {
          return { ok: false as const, error: '没有打开的标签页' };
        }
        void editor.closeTab(editor.activeTabId).catch(() => undefined);
        return { ok: true as const };
      }

      if (!tab || !isEditableTextTab(tab)) {
        return { ok: false as const, error: '当前标签页不可编辑' };
      }
      if (tab.truncated) {
        return { ok: false as const, error: '截断文件为只读，无法替换' };
      }
      editor.updateTabContent(tab.id, result.content);
      return { ok: true as const };
    },
    [editor, handleSave, handleSwitchWorkspace],
  );

  useEffect(() => {
    if (!config) {
      return;
    }
    setSidebarWidth(clampSidebarWidth(config.ui.sidebar_width));
  }, [config?.ui.sidebar_width]);

  const persistSidebarWidth = useCallback(async (width: number) => {
    if (!window.muled?.config?.getSettings || !window.muled?.config?.save) {
      return;
    }
    const { settings } = await window.muled.config.getSettings();
    const { config: next } = await window.muled.config.save({
      ...settings,
      ui: { ...settings.ui, sidebar_width: width },
    });
    setConfig(next);
  }, []);

  const applyConfigUpdate = useCallback(
    async (
      next: PublicConfig,
      workspacePathChanged: boolean,
    ) => {
      setConfig(next);
      if (!workspacePathChanged) {
        return;
      }
      const newRoot = next.workspace.path;
      if (!newRoot || newRoot === workspace.root) {
        return;
      }
      try {
        await workspace.cd(newRoot);
        editor.initFromConfig(next);
        clearSplit();
        resetTreeSelection();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        pushStatusToast(`工作区路径无效: ${message}`, 'error');
      }
    },
    [clearSplit, editor, resetTreeSelection, workspace],
  );

  const handleSettingsSaved = useCallback(
    async (form: SettingsForm) => {
      if (!window.muled?.config?.save) {
        throw new Error('应用 API 未就绪');
      }
      const { config: next, workspacePathChanged } =
        await window.muled.config.save(form);
      await applyConfigUpdate(next, workspacePathChanged);
      pushStatusToast('设置已保存', 'success');
    },
    [applyConfigUpdate],
  );

  const { resizing: sidebarResizing, resizeHandleProps } = useSidebarResize({
    enabled: sidebarVisible,
    width: sidebarWidth,
    onWidthChange: setSidebarWidth,
    onWidthCommit: (width) => {
      persistSidebarWidth(width).catch(() => undefined);
    },
  });

  const handleOpenFileInSplit = useCallback(
    (relativePath: string, placement: SplitPlacement) => {
      editor
        .openPathInSplit(relativePath, placement, split, assignSplit)
        .catch(() => undefined);
    },
    [assignSplit, editor, split],
  );

  const handleSelectTab = useCallback(
    (tabId: string) => {
      if (split) {
        if (tabId === split.primaryTabId) {
          focusSplitPane('primary');
          editor.setActiveTabInSplit(tabId);
          return;
        }
        if (tabId === split.secondaryTabId) {
          focusSplitPane('secondary');
          editor.setActiveTabInSplit(tabId);
          return;
        }
        for (const id of split.paneOnlyTabIds ?? []) {
          if (id !== tabId) {
            editor.closeTab(id).catch(() => undefined);
          }
        }
        clearSplit();
        setSplitCollapsePreserve(null);
      }
      editor.setActiveTab(tabId);
    },
    [clearSplit, editor, focusSplitPane, split],
  );

  const handleCloseSplitPane = useCallback(
    (pane: SplitPaneId) => {
      if (!split) return;
      const closedTabId = splitPaneTabId(split, pane);
      const closedTab = editor.tabs.find((t) => t.id === closedTabId);
      const survivorId = getSurvivorTabIdAfterClosePane(split, pane);
      const survivorPane = splitSurvivorPane(pane);
      const closePaneOnlyTab = (split.paneOnlyTabIds ?? []).includes(closedTabId);
      void (async () => {
        if (!(await editor.ensureCanProceed(closedTab))) return;
        if (survivorPane !== 'primary') {
          setSplitCollapsePreserve({
            pane: survivorPane,
            tabId: survivorId,
            direction: split.direction,
          });
        } else {
          setSplitCollapsePreserve(null);
        }
        clearSplit();
        editor.setActiveTabInSplit(survivorId);
        if (closePaneOnlyTab) {
          await editor.closeTab(closedTabId);
        }
      })();
    },
    [clearSplit, editor, getSurvivorTabIdAfterClosePane, split],
  );

  useEffect(() => {
    if (split) {
      setSplitCollapsePreserve(null);
    }
  }, [split]);

  useEffect(() => {
    if (!splitCollapsePreserve) return;
    if (editor.activeTabId !== splitCollapsePreserve.tabId) {
      setSplitCollapsePreserve(null);
    }
  }, [editor.activeTabId, splitCollapsePreserve]);

  const toggleTabViewMode = useCallback(() => {
    const tab = editor.activeTab;
    if (!tab || tab.truncated) {
      return;
    }
    if (tab.kind === 'docx') {
      const next = nextViewModeForTab(tab.kind, tab.viewMode);
      editor.setViewMode(tab.id, next);
      pushStatusToast(`视图: ${editorViewModeLabel(next)}`, 'info');
      return;
    }
    if (
      tab.kind !== 'markdown' &&
      tab.kind !== 'html' &&
      tab.kind !== 'csv' &&
      tab.kind !== 'ipynb' &&
      tab.kind !== 'strudel' &&
      tab.kind !== 'p5'
    ) {
      return;
    }
    const content =
      getEditorContentForViewSwitch(tab.id) ??
      getEditorViewContent(tab.id) ??
      tab.content;
    const next = nextViewModeForTab(tab.kind, tab.viewMode);
    editor.setViewMode(tab.id, next, content);
    pushStatusToast(`视图: ${editorViewModeLabel(next)}`, 'info');
  }, [editor]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault();
        openCommandPalette();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (editor.activeTabId) {
          handleSave(editor.activeTabId).catch((err) => {
            const message = err instanceof Error ? err.message : String(err);
            pushStatusToast(`保存失败: ${message}`, 'error');
          });
        }
        return;
      }
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === 'm'
      ) {
        e.preventDefault();
        toggleTabViewMode();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    editor.activeTabId,
    handleSave,
    openCommandPalette,
    toggleTabViewMode,
  ]);

  useEffect(() => {
    if (!editor.activeTab) {
      resetTreeSelection();
    }
  }, [editor.activeTab, resetTreeSelection]);

  useEffect(() => {
    if (!window.muled?.config) {
      setConfigError('应用 API 未就绪（请在 Electron 中运行）');
      return;
    }
    window.muled.config
      .get()
      .then((c) => {
        setConfig(c);
        editor.initFromConfig(c);
        return c;
      })
      .catch((e) => {
        setConfigError(e instanceof Error ? e.message : String(e));
      });
    // initFromConfig only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!window.muled?.config?.onConfigChanged) {
      return undefined;
    }
    return window.muled.config.onConfigChanged(
      ({ config: next, workspacePathChanged }) => {
        applyConfigUpdate(next, workspacePathChanged).catch(() => undefined);
      },
    );
  }, [applyConfigUpdate]);

  useEffect(() => {
    if (!window.muled?.menu?.onOpenTranslationHistory) {
      return undefined;
    }
    return window.muled.menu.onOpenTranslationHistory((path) => {
      editor.openPath(path).catch(() => undefined);
    });
  }, [editor]);

  useEffect(() => {
    if (!window.muled?.menu?.onOpenExternalDocument) {
      return undefined;
    }
    return window.muled.menu.onOpenExternalDocument(
      async ({ openPath, parentDir, switchWorkspace }) => {
        if (switchWorkspace) {
          await handleSwitchWorkspace(parentDir);
        }
        editor.openPath(openPath).catch(() => undefined);
      },
    );
  }, [editor, handleSwitchWorkspace]);

  useEffect(() => {
    if (!window.muled?.menu?.onOpenExternalDirectory) {
      return undefined;
    }
    return window.muled.menu.onOpenExternalDirectory(
      async ({ relativePath, absolutePath }) => {
        if (relativePath === null) {
          await handleSwitchWorkspace(absolutePath);
          return;
        }
        editor.openDirectoryGrid(relativePath).catch(() => undefined);
      },
    );
  }, [editor, handleSwitchWorkspace]);

  if (configError) {
    return <div className="AppShell__error">配置加载失败: {configError}</div>;
  }

  const uiConfig = config ?? DEFAULT_PUBLIC_CONFIG;
  const sidebarStyle = {
    ['--app-sidebar-width' as string]: `${sidebarWidth}px`,
  } as CSSProperties;

  const handleAppendMnote = useCallback(
    async (
      sourcePath: string,
      input: Parameters<typeof appendMnoteEntry>[1],
    ) => {
      try {
        const { mnotePath, content } = await appendMnoteEntry(sourcePath, input);
        const openTab = editor.tabs.find((t) => t.relativePath === mnotePath);
        if (openTab) {
          editor.updateTabContent(openTab.id, content);
        }
        pushStatusToast('笔记已保存', 'success');
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        pushStatusToast(`保存笔记失败: ${message}`, 'error');
        throw err;
      }
    },
    [editor],
  );

  const handleOpenMnoteSplit = useCallback(
    (sourcePath: string) => {
      const mnotePath = companionMnotePath(sourcePath);
      editor
        .openPathInSplit(mnotePath, 'right', split, assignSplit)
        .catch(() => undefined);
    },
    [assignSplit, editor, split],
  );

  const [activeMnoteEntryId, setActiveMnoteEntryId] = useState<string | null>(null);

  const primarySplitTab = split
    ? (editor.tabs.find((t) => t.id === split.primaryTabId) ?? null)
    : null;
  const secondarySplitTab = split
    ? (editor.tabs.find((t) => t.id === split.secondaryTabId) ?? null)
    : null;
  const mnoteSplitPair = resolveMnoteSplitPair(primarySplitTab, secondarySplitTab);

  const mnoteEntries: MnoteEntry[] = mnoteSplitPair
    ? (parseMnoteDocument(mnoteSplitPair.mnote.content)?.entries ?? [])
    : [];

  const handleMnoteEntryClick = useCallback(
    (entry: MnoteEntry) => {
      if (!mnoteSplitPair) return;
      const fullEntry =
        mnoteEntries.find((candidate) => candidate.id === entry.id) ?? entry;
      focusSplitPane(mnoteSplitPair.sourcePane);
      editor.setActiveTabInSplit(mnoteSplitPair.source.id);
      setActiveMnoteEntryId(fullEntry.id);
      const sourceContent =
        getEditorViewContent(mnoteSplitPair.source.id) ??
        mnoteSplitPair.source.content;
      editor.revealMnoteEntryOnTab(
        mnoteSplitPair.source.id,
        fullEntry,
        sourceContent,
      );
    },
    [editor, focusSplitPane, mnoteEntries, mnoteSplitPair],
  );

  useEffect(() => {
    if (!mnoteSplitPair) {
      setActiveMnoteEntryId(null);
    }
  }, [mnoteSplitPair?.mnote.id, mnoteSplitPair?.source.id]);

  const handlePdfTabPageChange = useCallback(
    (tabId: string, page: number) => {
      editor.setPdfLastPage(tabId, page);
    },
    [editor],
  );

  const handleWorkspacePathRenamed = useCallback(
    (from: string, to: string) => {
      const fromMnote = from.endsWith('/') ? null : companionMnotePath(from);
      const openMnoteTab = fromMnote
        ? editor.tabs.find((t) => t.relativePath === fromMnote)
        : undefined;

      editor.remapTabsForPathRename(from, to);
      syncMnoteOnWorkspacePathRenamed(from, to)
        .then(() => {
          if (!openMnoteTab || from.endsWith('/')) return undefined;
          const toMnote = companionMnotePath(to);
          return window.muled.file.read(toMnote).then((file) => {
            editor.updateTabContent(openMnoteTab.id, file.content);
          });
        })
        .catch(() => undefined);
    },
    [editor],
  );

  const makeCopyPdfToOtherPane = useCallback(
    (tab: EditorTab | null | undefined, pane?: SplitPaneId) => {
      if (!split || !pane || !tab || tab.kind !== 'pdf') {
        return undefined;
      }
      const otherPane: SplitPaneId = pane === 'primary' ? 'secondary' : 'primary';
      const otherTabId = splitPaneTabId(split, otherPane);
      return (text: string) => {
        const trimmed = text.trim();
        if (!trimmed) return;

        const otherTab = editor.tabs.find((t) => t.id === otherTabId);
        if (!otherTab) return;
        if (!isEditableTextTab(otherTab)) {
          pushStatusToast('另一侧不是可编辑文本', 'info');
          return;
        }
        if (otherTab.truncated) {
          pushStatusToast('另一侧为只读截断预览，无法写入', 'info');
          return;
        }

        if (!appendTextToEditorTab(otherTabId, trimmed)) {
          const current = getEditorViewContent(otherTabId) ?? otherTab.content;
          editor.updateTabContent(
            otherTabId,
            appendTextAtDocumentEnd(current, trimmed),
          );
        }
        pushStatusToast('已复制到另一侧', 'success');
      };
    },
    [editor, split],
  );

  const renderTabContent = useCallback(
    (
      tab: typeof editor.activeTab,
      options?: {
        layout?: 'full' | 'pane';
        pane?: SplitPaneId;
        focused?: boolean;
      },
    ) => {
      const tabId = tab?.id;
      const nav = tabId ? editor.getTabNavigation(tabId) : editor.tabNavigation;
      const isPane = options?.layout === 'pane';
      const isMnoteSplit =
        Boolean(split && mnoteSplitPair && tabId);
      const isMnotePane =
        Boolean(isMnoteSplit && tabId === mnoteSplitPair!.mnote.id);
      const isSourcePane =
        Boolean(isMnoteSplit && tabId === mnoteSplitPair!.source.id);

      const activeMnoteEntry =
        isSourcePane && activeMnoteEntryId
          ? (mnoteEntries.find((e) => e.id === activeMnoteEntryId) ?? null)
          : null;
      const mnotePagePdfHighlights =
        isSourcePane && mnoteSplitPair?.source.kind === 'pdf'
          ? resolveMnoteQuotePdfHighlightsForPage(
              mnoteEntries,
              mnoteSplitPair.source.pdfLastPage ?? 1,
            )
          : [];
      const mnoteQuoteEditorHighlight =
        activeMnoteEntry && mnoteSplitPair?.source.kind === 'markdown'
          ? resolveMnoteQuoteEditorHighlight(
              activeMnoteEntry,
              getEditorViewContent(mnoteSplitPair.source.id) ??
                mnoteSplitPair.source.content,
            )
          : null;

      return (
        <TabContent
          key={tabId ?? 'empty'}
          tab={tab}
          workspaceRoot={workspace.root}
          layout={options?.layout ?? 'full'}
          focused={options?.focused ?? true}
          activeMnoteEntryId={
            isMnotePane || isSourcePane ? activeMnoteEntryId : null
          }
          onMnoteEntryClick={isMnotePane ? handleMnoteEntryClick : undefined}
          onClearMnoteReveal={
            isSourcePane
              ? () => editor.clearMnoteRevealOnTab(mnoteSplitPair!.source.id)
              : undefined
          }
          onPdfPageChange={
            tab?.kind === 'pdf'
              ? (page) => {
                  if (tabId) handlePdfTabPageChange(tabId, page);
                }
              : undefined
          }
          mnotePagePdfHighlights={isSourcePane ? mnotePagePdfHighlights : []}
          mnoteQuoteEditorHighlight={
            isSourcePane ? mnoteQuoteEditorHighlight : null
          }
          onCopyPdfSelectionToOtherPane={makeCopyPdfToOtherPane(tab, options?.pane)}
          onAppendMnote={handleAppendMnote}
          onOpenMnoteSplit={handleOpenMnoteSplit}
          sourceFont={uiConfig.editor.source}
          wysiwygFont={uiConfig.editor.wysiwyg}
          hasApiKey={uiConfig.openai.has_api_key}
          onContentChange={(content) => {
            if (tabId) {
              editor.updateTabContent(tabId, content);
            }
          }}
          onDocxDirty={(id) => {
            editor.markTabDirty(id);
          }}
          onXlsxDirty={(id) => {
            editor.markTabDirty(id);
          }}
          onAiOpen={openAiDialog}
          onViewModeChange={(id, viewMode, content) => {
            editor.setViewMode(id, viewMode, content);
          }}
          onSave={(id) => {
            handleSave(id).catch((err) => {
              const message = err instanceof Error ? err.message : String(err);
              pushStatusToast(`保存失败: ${message}`, 'error');
            });
          }}
          onOpenFile={(path) => {
            editor.openPath(path).catch(() => undefined);
          }}
          onOpenFileFromEditor={(path) => {
            editor.openPathFromEditorLink(path).catch(() => undefined);
          }}
          tabNavigation={nav}
          onTabNavigateBack={() => {
            if (tabId) {
              editor.navigateTabBack(tabId).catch(() => undefined);
            }
          }}
          onTabNavigateForward={() => {
            if (tabId) {
              editor.navigateTabForward(tabId).catch(() => undefined);
            }
          }}
          onHtmlPreviewNavigate={(readPath, hash) => {
            editor.navigateHtmlPreviewToPath(readPath, hash).catch(() => undefined);
          }}
          onClearHtmlPreviewHash={(id) => {
            editor.clearHtmlPreviewHash(id);
          }}
          onOpenDirectoryGrid={(path) => {
            editor.openDirectoryGrid(path).catch(() => undefined);
          }}
          onFocusPane={
            options?.pane
              ? () => {
                  focusSplitPane(options.pane!);
                  if (tabId) {
                    if (split) {
                      editor.setActiveTabInSplit(tabId);
                    } else {
                      editor.setActiveTab(tabId);
                    }
                  }
                }
              : undefined
          }
          onClosePane={
            options?.pane
              ? () => handleCloseSplitPane(options.pane!)
              : undefined
          }
        />
      );
    },
    [
      editor,
      focusSplitPane,
      handleCloseSplitPane,
      handleSave,
      handleAppendMnote,
      handleMnoteEntryClick,
      handleOpenMnoteSplit,
      handlePdfTabPageChange,
      makeCopyPdfToOtherPane,
      mnoteSplitPair,
      activeMnoteEntryId,
      mnoteEntries,
      split,
      openAiDialog,
      uiConfig.editor.source,
      uiConfig.editor.wysiwyg,
      uiConfig.openai.has_api_key,
      workspace.root,
    ],
  );

  const collapsedSplitTab = splitCollapsePreserve
    ? (editor.tabs.find((t) => t.id === splitCollapsePreserve.tabId) ?? null)
    : null;

  const tabContent = split ? (
    <EditorSplitView
      layout={split}
      onRatioChange={setSplitRatio}
      primary={renderTabContent(primarySplitTab, {
        layout: 'pane',
        pane: 'primary',
        focused: split.focusedPane === 'primary',
      })}
      secondary={renderTabContent(secondarySplitTab, {
        layout: 'pane',
        pane: 'secondary',
        focused: split.focusedPane === 'secondary',
      })}
    />
  ) : splitCollapsePreserve && collapsedSplitTab ? (
    <EditorSplitView
      layout={{
        direction: splitCollapsePreserve.direction,
        ratio: splitCollapsePreserve.pane === 'primary' ? 1 : 0,
        primaryTabId: splitCollapsePreserve.tabId,
        secondaryTabId: splitCollapsePreserve.tabId,
        focusedPane: splitCollapsePreserve.pane,
      }}
      hiddenPane={
        splitCollapsePreserve.pane === 'primary' ? 'secondary' : 'primary'
      }
      onRatioChange={() => {}}
      primary={
        splitCollapsePreserve.pane === 'primary'
          ? renderTabContent(collapsedSplitTab)
          : null
      }
      secondary={
        splitCollapsePreserve.pane === 'secondary'
          ? renderTabContent(collapsedSplitTab)
          : null
      }
    />
  ) : editor.activeTab ? (
    <EditorSplitView
      layout={{
        direction: 'horizontal',
        ratio: 1,
        primaryTabId: editor.activeTab.id,
        secondaryTabId: editor.activeTab.id,
        focusedPane: 'primary',
      }}
      hiddenPane="secondary"
      onRatioChange={() => {}}
      primary={renderTabContent(editor.activeTab)}
      secondary={null}
    />
  ) : (
    renderTabContent(null)
  );

  return (
    <EditorIndentProvider value={uiConfig.editor.indent}>
    <div
      className={`AppShell${sidebarResizing ? ' AppShell--sidebar-resizing' : ''}`}
    >
      <StatusToast />
      <CommandPalette
        open={paletteOpen}
        initialValue={paletteInitialValue}
        onClose={closeCommandPalette}
        onSubmit={handlePaletteSubmit}
        onOpenSearchResult={handleOpenSearchResult}
        resolveCompletion={resolvePaletteCompletion}
      />
      <PromptDialog
        open={aiDialog !== null}
        mode={aiDialog?.mode ?? 'replace'}
        selectionPreview={aiDialog?.snapshot.selection ?? ''}
        hasApiKey={uiConfig.openai.has_api_key}
        onClose={closeAiDialog}
        onSubmit={handleAiSubmit}
      />
      <UnsavedChangesDialog
        tab={unsavedDialog.dialogTab}
        onSave={unsavedDialog.chooseSave}
        onDiscard={unsavedDialog.chooseDiscard}
        onCancel={unsavedDialog.chooseCancel}
      />
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSaved={handleSettingsSaved}
      />
      <aside
        className={`AppShell__sidebar${sidebarVisible ? '' : ' AppShell__sidebar--hidden'}`}
        style={sidebarStyle}
        aria-hidden={!sidebarVisible}
      >
        <SidebarTabs
          activeEditorTab={editor.activeTab}
          outlineItems={outlineItems}
          paths={workspace.paths}
          workspaceRoot={workspace.root}
          homeDir={uiConfig.system.homedir}
          recentWorkspaces={workspace.recent}
          initialExpansionDepth={uiConfig.ui.tree_initial_expansion_depth}
          pathsLoading={workspace.loading}
          workspaceError={workspace.error}
          onRetryWorkspace={() => {
            workspace.refresh().catch(() => {
              /* setState in refresh */
            });
          }}
          selectionResetKey={treeSelectionResetKey}
          revealRequest={treeRevealRequest}
          onSwitchWorkspace={(path) => {
            handleSwitchWorkspace(path).catch(() => {
              /* toast in handleSwitchWorkspace */
            });
          }}
          onWorkspaceHistoryChanged={workspace.updateRecent}
          onOpenFile={(path) => {
            editor.openPath(path).catch(() => undefined);
          }}
          onOpenFileInNewTab={(path) => {
            editor.openPathInNewTab(path).catch(() => undefined);
          }}
          onOpenFileInSplit={handleOpenFileInSplit}
          onOpenDirectoryGrid={(path) => {
            editor.openDirectoryGrid(path).catch(() => {
              /* openDirectoryGrid is sync-safe */
            });
          }}
          onDeletePath={(path) => editor.closeTabsForDeletedPath(path)}
          onPathRenamed={handleWorkspacePathRenamed}
          onRevealInEditor={(item) => {
            const activeTab = editor.activeTab;
            const relativePath = activeTab?.relativePath;
            if (!relativePath) {
              return;
            }
            const handlers = activeTab
              ? getEditorOutlineHandlers(activeTab.id)
              : null;
            if (
              handlers?.revealOutlineTarget({
                line: item.line,
                title: item.title,
                hash: item.hash ?? null,
              })
            ) {
              return;
            }
            if (!item.line) {
              return;
            }
            editor
              .openPathWithReveal(relativePath, {
                id: newId(),
                line: item.line,
                column: 1,
                length: 1,
              })
              .catch(() => undefined);
          }}
        />
      </aside>
      {sidebarVisible ? (
        <div
          className={`AppShell__sidebarResize${sidebarResizing ? ' AppShell__sidebarResize--active' : ''}`}
          {...resizeHandleProps}
        />
      ) : null}
      <main className="AppShell__main">
        <div className="AppShell__mainBody">
          <TabBar
            tabs={tabBarTabs}
            activeTabId={tabBarActiveId}
            sidebarVisible={sidebarVisible}
            onToggleSidebar={() => setSidebarVisible((v) => !v)}
            onSelect={handleSelectTab}
            onClose={(tabId) => {
              editor
                .closeTab(tabId)
                .then(() => resetTreeSelection())
                .catch(() => undefined);
            }}
            onAdd={() => {
              editor.addTab();
              resetTreeSelection();
            }}
            onOpenSettings={() => setSettingsOpen(true)}
          />
          <PdfEngineProvider>{tabContent}</PdfEngineProvider>
        </div>
        <StatusBar
          workspaceRoot={workspace.root}
          tab={editor.activeTab}
          hasApiKey={uiConfig.openai.has_api_key}
          onRevealPathInTree={revealPathInTree}
          onKeybindingModeToggle={(tabId, mode) => {
            editor.setKeybindingMode(tabId, mode);
            pushStatusToast(
              `键位: ${mode === 'vim' ? 'Vim' : 'Normal'}`,
              'info',
            );
          }}
        />
      </main>
    </div>
    </EditorIndentProvider>
  );
}
