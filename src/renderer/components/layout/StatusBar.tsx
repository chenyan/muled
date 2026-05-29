import type { EditorMode, EditorViewMode } from '../../../shared/types/config';
import type { EditorTab } from '../../types/tab';
import { isEditableTextTab, tabLabel } from '../../types/tab';
import './StatusBar.css';

interface StatusBarProps {
  workspaceRoot: string;
  tab: EditorTab | null;
  hasApiKey: boolean;
}

function shortenPath(path: string, maxLen = 48): string {
  if (path.length <= maxLen) return path;
  const head = path.slice(0, 20);
  const tail = path.slice(-(maxLen - 23));
  return `${head}…${tail}`;
}

function viewModeLabel(mode: EditorViewMode): string {
  return mode === 'rich-text' ? 'WYSIWYG' : 'Source';
}

export default function StatusBar({
  workspaceRoot,
  tab,
  hasApiKey,
}: StatusBarProps) {
  const workspaceLabel = shortenPath(workspaceRoot);

  let fileHint = '无文件';
  let dirty = false;
  let viewMode: EditorViewMode | null = null;
  let keyMode: EditorMode | null = null;
  let truncated = false;

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
      <span
        className={`StatusBar__segment StatusBar__file${dirty ? ' StatusBar__file--dirty' : ''}`}
        title={tab?.relativePath ?? undefined}
      >
        {dirty && <span className="StatusBar__dirtyDot" aria-label="未保存" />}
        {shortenPath(fileHint, 40)}
        {dirty ? ' · 未保存' : ''}
      </span>
      <span className="StatusBar__spacer" />
      <span className="StatusBar__segment StatusBar__meta">
        {truncated && (
          <span className="StatusBar__badge StatusBar__badge--warn">
            只读·截断
          </span>
        )}
        {viewMode && (
          <span className="StatusBar__badge">{viewModeLabel(viewMode)}</span>
        )}
        {keyMode && (
          <span className="StatusBar__badge">
            {keyMode === 'vim' ? 'Vim' : 'Normal'}
          </span>
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
