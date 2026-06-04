import type { EditorMode, EditorViewMode } from '../../../shared/types/config';
import { editorViewModeLabel } from '../../lib/editorViewMode';
import { buildPathBreadcrumbs } from '../../lib/workspaceTreeReveal';
import type { EditorTab } from '../../types/tab';
import { isEditableTextTab, tabLabel } from '../../types/tab';
import './StatusBar.css';

interface StatusBarProps {
  workspaceRoot: string;
  tab: EditorTab | null;
  hasApiKey: boolean;
  onKeybindingModeToggle?: (tabId: string, mode: EditorMode) => void;
  /** 点击路径分段时在文件树中展开并选中 */
  onRevealPathInTree?: (treePath: string) => void;
}

function shortenPath(path: string, maxLen = 48): string {
  if (path.length <= maxLen) return path;
  const head = path.slice(0, 20);
  const tail = path.slice(-(maxLen - 23));
  return `${head}…${tail}`;
}

export default function StatusBar({
  workspaceRoot,
  tab,
  hasApiKey,
  onKeybindingModeToggle,
  onRevealPathInTree,
}: StatusBarProps) {
  const workspaceLabel = shortenPath(workspaceRoot);

  let fileHint = '无文件';
  let dirty = false;
  let viewMode: EditorViewMode | null = null;
  let keyMode: EditorMode | null = null;
  let truncated = false;

  const pathBreadcrumbs =
    tab?.relativePath != null
      ? buildPathBreadcrumbs(tab.relativePath)
      : null;

  if (tab) {
    fileHint = tab.relativePath ?? tabLabel(tab);
    dirty = tab.dirty;
    truncated = tab.truncated;
    if (isEditableTextTab(tab)) {
      keyMode = tab.keybindingMode;
      if (tab.kind === 'markdown') {
        viewMode = tab.viewMode;
      }
    }
  }

  const fileSegment = pathBreadcrumbs ? (
    <span
      className={`StatusBar__breadcrumb${dirty ? ' StatusBar__file--dirty' : ''}`}
      title={tab?.relativePath ?? undefined}
    >
      {dirty && <span className="StatusBar__dirtyDot" aria-label="未保存" />}
      {pathBreadcrumbs.map((crumb, index) => (
        <span key={crumb.treePath} className="StatusBar__crumbGroup">
          {index > 0 ? (
            <span className="StatusBar__crumbSep" aria-hidden>
              /
            </span>
          ) : null}
          <button
            type="button"
            className="StatusBar__crumb"
            disabled={!onRevealPathInTree}
            title={crumb.treePath}
            onClick={() => onRevealPathInTree?.(crumb.treePath)}
          >
            {crumb.label}
          </button>
        </span>
      ))}
      {dirty ? <span className="StatusBar__dirtyHint"> · 未保存</span> : null}
    </span>
  ) : (
    <span
      className={`StatusBar__segment StatusBar__file${dirty ? ' StatusBar__file--dirty' : ''}`}
      title={tab?.relativePath ?? undefined}
    >
      {dirty && <span className="StatusBar__dirtyDot" aria-label="未保存" />}
      {shortenPath(fileHint, 40)}
      {dirty ? ' · 未保存' : ''}
    </span>
  );

  return (
    <footer className="StatusBar" aria-label="状态栏">
      <span
        className="StatusBar__segment StatusBar__workspace"
        title={workspaceRoot}
      >
        {workspaceLabel}
      </span>
      <span className="StatusBar__sep" aria-hidden>
        ·
      </span>
      {fileSegment}
      <span className="StatusBar__spacer" />
      <span className="StatusBar__segment StatusBar__meta">
        {truncated && (
          <span className="StatusBar__badge StatusBar__badge--warn">
            只读·截断
          </span>
        )}
        {viewMode && (
          <span className="StatusBar__badge">{editorViewModeLabel(viewMode)}</span>
        )}
        {keyMode && tab && isEditableTextTab(tab) && (
          <button
            type="button"
            className="StatusBar__badge StatusBar__badge--clickable"
            disabled={tab.truncated}
            title={
              tab.truncated
                ? '截断文件不可切换键位'
                : `键位: ${keyMode === 'vim' ? 'Vim' : 'Normal'}（点击切换）`
            }
            onClick={() => {
              if (tab.truncated || !onKeybindingModeToggle) return;
              const next: EditorMode = keyMode === 'vim' ? 'normal' : 'vim';
              onKeybindingModeToggle(tab.id, next);
            }}
          >
            {keyMode === 'vim' ? 'Vim' : 'Normal'}
          </button>
        )}
        {!hasApiKey && (
          <span
            className="StatusBar__badge StatusBar__badge--muted"
            title="配置 openai.api_key 以启用 AI"
          >
            AI 未配置
          </span>
        )}
      </span>
      <span className="StatusBar__sep" aria-hidden>
        ·
      </span>
      <span className="StatusBar__segment StatusBar__hints">
        ⌘P 命令 · ⌘S 保存
        {viewMode ? ' · ⌘⇧M 视图' : ''}
      </span>
    </footer>
  );
}
