import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from 'react';
import type { AiApplyMode } from '../../../shared/buildAiPrompt';
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
import { getEditorViewContent } from '../../lib/editorViewBridge';
import { getActiveEditorSelection } from '../../lib/editorSelectionBridge';
import { runPaletteCommand } from '../../lib/runPaletteCommand';
import { getCdPaletteCompletion } from '../../../shared/paletteAutoCompletion';
import { pushStatusToast } from '../../lib/statusToast';
import { isEditableTextTab } from '../../types/tab';
import TabBar from '../tabs/TabBar';
import PdfEngineProvider from '../editor/pdf/PdfEngineProvider';
import TabContent from '../tabs/TabContent';
import WorkspaceTree, {
  type WorkspaceTreeRevealRequest,
} from '../tree/WorkspaceTree';
import StatusBar from './StatusBar';
import StatusToast from './StatusToast';
import './AppShell.css';

export default function AppShell() {
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const workspace = useWorkspace();
  const unsavedDialog = useUnsavedChangesDialog();
  const editor = useEditorTabs(config, {
    confirmUnsaved: unsavedDialog.confirmUnsaved,
  });
  const [treeSelectionResetKey, setTreeSelectionResetKey] = useState(0);
  const [treeRevealRequest, setTreeRevealRequest] =
    useState<WorkspaceTreeRevealRequest | null>(null);
  const resetTreeSelection = useCallback(() => {
    setTreeSelectionResetKey((key) => key + 1);
  }, []);
  const revealPathInTree = useCallback((treePath: string) => {
    setTreeRevealRequest({ treePath, nonce: Date.now() });
  }, []);

  const hasPdfTab = useMemo(
    () => editor.tabs.some((t) => t.kind === 'pdf'),
    [editor.tabs],
  );

  const handleSwitchWorkspace = useCallback(
    async (targetPath: string) => {
      if (!config || targetPath === workspace.root || workspace.loading) {
        return;
      }
      try {
        await workspace.cd(targetPath);
        editor.initFromConfig(config);
        resetTreeSelection();
        pushStatusToast(`工作区: ${targetPath}`, 'success');
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        pushStatusToast(`切换工作区失败: ${message}`, 'error');
      }
    },
    [config, editor, resetTreeSelection, workspace],
  );

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteInitialValue, setPaletteInitialValue] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);

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

      if (!tab || !isEditableTextTab(tab)) {
        return { ok: false as const, error: '当前标签页不可编辑' };
      }
      if (tab.truncated) {
        return { ok: false as const, error: '截断文件为只读，无法替换' };
      }
      editor.updateTabContent(tab.id, result.content);
      return { ok: true as const };
    },
    [editor, handleSwitchWorkspace],
  );

  const handleSettingsSaved = useCallback(
    async (form: SettingsForm) => {
      if (!window.muled?.config?.save) {
        throw new Error('应用 API 未就绪');
      }
      const next = await window.muled.config.save(form);
      setConfig(next);
      const newRoot = next.workspace.path;
      if (newRoot && newRoot !== workspace.root) {
        try {
          await workspace.cd(newRoot);
          editor.initFromConfig(next);
          resetTreeSelection();
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          pushStatusToast(`工作区路径无效: ${message}`, 'error');
        }
      }
      pushStatusToast('设置已保存', 'success');
    },
    [editor, resetTreeSelection, workspace],
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

  const toggleMarkdownViewMode = useCallback(() => {
    const tab = editor.activeTab;
    if (!tab || tab.kind !== 'markdown' || tab.truncated) return;
    const content = getEditorViewContent(tab.id) ?? tab.content;
    const next = tab.viewMode === 'rich-text' ? 'source' : 'rich-text';
    editor.setViewMode(tab.id, next, content);
    pushStatusToast(
      `视图: ${next === 'rich-text' ? 'WYSIWYG' : 'Source'}`,
      'info',
    );
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
        toggleMarkdownViewMode();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    editor.activeTabId,
    handleSave,
    openCommandPalette,
    toggleMarkdownViewMode,
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

  if (configError) {
    return <div className="AppShell__error">配置加载失败: {configError}</div>;
  }

  const uiConfig = config ?? DEFAULT_PUBLIC_CONFIG;
  const sidebarStyle = {
    ['--app-sidebar-width' as string]: `${uiConfig.ui.sidebar_width}px`,
  } as CSSProperties;

  const tabContent = (
    <TabContent
      tab={editor.activeTab}
      sourceFont={uiConfig.editor.source}
      wysiwygFont={uiConfig.editor.wysiwyg}
      hasApiKey={uiConfig.openai.has_api_key}
      onContentChange={editor.updateActiveContent}
      onAiOpen={openAiDialog}
      onViewModeChange={(tabId, viewMode, content) => {
        editor.setViewMode(tabId, viewMode, content);
      }}
      onSave={(tabId) => {
        handleSave(tabId).catch((err) => {
          const message = err instanceof Error ? err.message : String(err);
          pushStatusToast(`保存失败: ${message}`, 'error');
        });
      }}
    />
  );

  return (
    <div className="AppShell">
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
      <aside className="AppShell__sidebar" style={sidebarStyle}>
        <WorkspaceTree
          key={uiConfig.ui.tree_initial_expansion_depth}
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
          onOpenFile={(path) => {
            editor.openPath(path).catch(() => {
              /* alert in openPath */
            });
          }}
        />
      </aside>
      <main className="AppShell__main">
        <div className="AppShell__mainBody">
          <TabBar
            tabs={editor.tabs}
            activeTabId={editor.activeTabId}
            onSelect={editor.setActiveTab}
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
          {hasPdfTab ? (
            <PdfEngineProvider>{tabContent}</PdfEngineProvider>
          ) : (
            tabContent
          )}
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
  );
}
