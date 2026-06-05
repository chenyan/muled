import { useMemo, useState } from 'react';
import type { SplitPlacement } from '../../../shared/editorSplit';
import type { SidebarOutlineItem } from '../../lib/outlineIndex';
import type { EditorTab } from '../../types/tab';
import WorkspaceTree, { type WorkspaceTreeRevealRequest } from '../tree/WorkspaceTree';

type SidebarTabId = 'files' | 'outline';

interface SidebarTabsProps {
  activeEditorTab: EditorTab | null;
  outlineItems: SidebarOutlineItem[];
  paths: string[];
  workspaceRoot: string;
  homeDir: string;
  recentWorkspaces: string[];
  initialExpansionDepth: number;
  pathsLoading?: boolean;
  workspaceError?: string | null;
  onRetryWorkspace?: () => void;
  selectionResetKey: number;
  revealRequest?: WorkspaceTreeRevealRequest | null;
  onSwitchWorkspace: (absolutePath: string) => void;
  onOpenFile: (relativePath: string) => void;
  onOpenFileInSplit?: (relativePath: string, placement: SplitPlacement) => void;
  onOpenDirectoryGrid: (relativePath: string) => void;
  onRevealInEditor: (item: SidebarOutlineItem) => void;
}

export default function SidebarTabs({
  activeEditorTab,
  outlineItems,
  paths,
  workspaceRoot,
  homeDir,
  recentWorkspaces,
  initialExpansionDepth,
  pathsLoading = false,
  workspaceError = null,
  onRetryWorkspace,
  selectionResetKey,
  revealRequest,
  onSwitchWorkspace,
  onOpenFile,
  onOpenFileInSplit,
  onOpenDirectoryGrid,
  onRevealInEditor,
}: SidebarTabsProps) {
  const [activeTab, setActiveTab] = useState<SidebarTabId>('files');
  const outlineHint = useMemo(() => {
    if (!activeEditorTab) return '打开文件后显示大纲';
    if (activeEditorTab.kind === 'markdown') return '显示 H1-H3 标题';
    if (activeEditorTab.kind === 'html') return '显示标题与 H1-H6';
    if (activeEditorTab.kind === 'text') return '显示顶层符号';
    if (activeEditorTab.kind === 'pdf') return '显示 PDF 目录';
    return '当前类型暂无大纲';
  }, [activeEditorTab]);

  return (
    <div className="SidebarTabs">
      <div className="SidebarTabs__header" role="tablist" aria-label="侧边栏标签">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'files'}
          aria-label="文件"
          className={`SidebarTabs__tab TabBar__sidebarToggle${activeTab === 'files' ? ' SidebarTabs__tab--active TabBar__sidebarToggle--active' : ''}`}
          title="文件"
          onClick={() => setActiveTab('files')}
        >
          <svg
            viewBox="0 0 24 24"
            className="SidebarTabs__tabIcon TabBar__sidebarToggleIcon"
            aria-hidden="true"
          >
            <path d="M3.75 7.5h5.5l1.5-2h9a.75.75 0 0 1 .75.75v11.5a.75.75 0 0 1-.75.75H3.75a.75.75 0 0 1-.75-.75V8.25a.75.75 0 0 1 .75-.75Z" />
          </svg>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'outline'}
          aria-label="大纲"
          className={`SidebarTabs__tab TabBar__sidebarToggle${activeTab === 'outline' ? ' SidebarTabs__tab--active TabBar__sidebarToggle--active' : ''}`}
          title="大纲"
          onClick={() => setActiveTab('outline')}
        >
          <svg
            viewBox="0 0 24 24"
            className="SidebarTabs__tabIcon TabBar__sidebarToggleIcon"
            aria-hidden="true"
          >
            <path d="M5 7.5h14M5 12h14M5 16.5h9" />
          </svg>
        </button>
      </div>

      <div className="SidebarTabs__body">
        <div
          className={`SidebarTabs__panel${activeTab === 'files' ? ' SidebarTabs__panel--active' : ''}`}
          role="tabpanel"
          aria-hidden={activeTab !== 'files'}
        >
          <WorkspaceTree
            key={workspaceRoot}
            paths={paths}
            workspaceRoot={workspaceRoot}
            homeDir={homeDir}
            recentWorkspaces={recentWorkspaces}
            initialExpansionDepth={initialExpansionDepth}
            pathsLoading={pathsLoading}
            workspaceError={workspaceError}
            onRetryWorkspace={onRetryWorkspace}
            selectionResetKey={selectionResetKey}
            revealRequest={revealRequest}
            onSwitchWorkspace={onSwitchWorkspace}
            onOpenFile={onOpenFile}
            onOpenFileInSplit={onOpenFileInSplit}
            onOpenDirectoryGrid={onOpenDirectoryGrid}
          />
        </div>
        <div
          className={`SidebarTabs__panel${activeTab === 'outline' ? ' SidebarTabs__panel--active' : ''}`}
          role="tabpanel"
          aria-hidden={activeTab !== 'outline'}
        >
          <section className="SidebarTabs__outline" aria-label="文件大纲">
            <div className="SidebarTabs__outlineHint">{outlineHint}</div>
            {outlineItems.length === 0 ? (
              <div className="SidebarTabs__empty">暂无可用索引</div>
            ) : (
              <ul className="SidebarTabs__outlineList">
                {outlineItems.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="SidebarTabs__outlineItem"
                      style={{ paddingLeft: `${8 + (item.depth - 1) * 14}px` }}
                      onClick={() => {
                        if (item.line) {
                          onRevealInEditor(item);
                        }
                      }}
                      title={item.page ? `第 ${item.page} 页` : undefined}
                    >
                      <span className="SidebarTabs__outlineTitle">{item.title}</span>
                      {item.page ? (
                        <span className="SidebarTabs__outlineMeta">P{item.page}</span>
                      ) : item.line ? (
                        <span className="SidebarTabs__outlineMeta">L{item.line}</span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
