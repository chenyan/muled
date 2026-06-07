import { useCallback, useEffect, useState } from 'react';
import { formatWorkspacePathLabel } from '../../lib/formatWorkspacePathLabel';
import {
  MAX_RECENT_WORKSPACES,
  type WorkspaceHistoryEntry,
} from '../../../shared/types/workspaceHistory';
import './WorkspaceHistoryDialog.css';

export interface WorkspaceHistoryDialogProps {
  open: boolean;
  homeDir: string;
  onClose: () => void;
  onChanged: (pickerPaths: string[]) => void;
}

export default function WorkspaceHistoryDialog({
  open,
  homeDir,
  onClose,
  onChanged,
}: WorkspaceHistoryDialogProps) {
  const [entries, setEntries] = useState<WorkspaceHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyPath, setBusyPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!window.muled?.workspace?.getHistory) return;
    setLoading(true);
    setError(null);
    try {
      const result = await window.muled.workspace.getHistory();
      setEntries(result.entries);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    refresh().catch(() => undefined);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busyPath) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, refresh, onClose, busyPath]);

  const applyResult = useCallback(
    (pickerPaths: string[], nextEntries: WorkspaceHistoryEntry[]) => {
      setEntries(nextEntries);
      onChanged(pickerPaths);
    },
    [onChanged],
  );

  const handleTogglePinned = useCallback(
    async (entry: WorkspaceHistoryEntry) => {
      if (!window.muled?.workspace?.setPinned || busyPath) return;
      setBusyPath(entry.path);
      setError(null);
      try {
        const result = await window.muled.workspace.setPinned({
          path: entry.path,
          pinned: !entry.pinned,
        });
        applyResult(result.pickerPaths, result.entries);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusyPath(null);
      }
    },
    [applyResult, busyPath],
  );

  const handleRemove = useCallback(
    async (entry: WorkspaceHistoryEntry) => {
      if (!window.muled?.workspace?.removeFromHistory || busyPath) return;
      setBusyPath(entry.path);
      setError(null);
      try {
        const result = await window.muled.workspace.removeFromHistory({
          path: entry.path,
        });
        applyResult(result.pickerPaths, result.entries);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusyPath(null);
      }
    },
    [applyResult, busyPath],
  );

  if (!open) return null;

  return (
    <div
      className="WorkspaceHistoryDialog__backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busyPath) onClose();
      }}
    >
      <div
        className="WorkspaceHistoryDialog"
        role="dialog"
        aria-labelledby="workspace-history-dialog-title"
        aria-describedby="workspace-history-dialog-desc"
      >
        <header className="WorkspaceHistoryDialog__header">
          <h2
            id="workspace-history-dialog-title"
            className="WorkspaceHistoryDialog__title"
          >
            工作目录历史编辑
          </h2>
          <button
            type="button"
            className="WorkspaceHistoryDialog__close"
            aria-label="关闭"
            disabled={Boolean(busyPath)}
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <p
          id="workspace-history-dialog-desc"
          className="WorkspaceHistoryDialog__hint"
        >
          固定的工作目录始终保留，且不计入最近 {MAX_RECENT_WORKSPACES}{' '}
          条历史限制。
        </p>
        <div className="WorkspaceHistoryDialog__body">
          {loading ? (
            <p className="WorkspaceHistoryDialog__status">加载中…</p>
          ) : null}
          {error ? (
            <p className="WorkspaceHistoryDialog__error" role="alert">
              {error}
            </p>
          ) : null}
          {!loading && entries.length === 0 ? (
            <p className="WorkspaceHistoryDialog__status">暂无工作目录历史</p>
          ) : null}
          {entries.length > 0 ? (
            <ul className="WorkspaceHistoryDialog__list">
              {entries.map((entry) => {
                const busy = busyPath === entry.path;
                const label = formatWorkspacePathLabel(entry.path, homeDir);
                return (
                  <li key={entry.path} className="WorkspaceHistoryDialog__item">
                    <div className="WorkspaceHistoryDialog__itemMain">
                      <span
                        className={`WorkspaceHistoryDialog__pinBadge${entry.pinned ? ' WorkspaceHistoryDialog__pinBadge--active' : ''}`}
                        title={entry.pinned ? '已固定' : '未固定'}
                        aria-hidden
                      >
                        {entry.pinned ? '★' : '☆'}
                      </span>
                      <span
                        className="WorkspaceHistoryDialog__path"
                        title={entry.path}
                      >
                        {label}
                      </span>
                    </div>
                    <div className="WorkspaceHistoryDialog__actions">
                      <button
                        type="button"
                        className="WorkspaceHistoryDialog__btn"
                        disabled={Boolean(busyPath)}
                        title={entry.pinned ? '取消固定' : '固定'}
                        onClick={() => {
                          handleTogglePinned(entry).catch(() => undefined);
                        }}
                      >
                        {busy ? '…' : entry.pinned ? '取消固定' : '固定'}
                      </button>
                      <button
                        type="button"
                        className="WorkspaceHistoryDialog__btn WorkspaceHistoryDialog__btn--danger"
                        disabled={Boolean(busyPath)}
                        title="从历史中删除"
                        onClick={() => {
                          handleRemove(entry).catch(() => undefined);
                        }}
                      >
                        {busy ? '…' : '删除'}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
        <footer className="WorkspaceHistoryDialog__footer">
          <button
            type="button"
            className="WorkspaceHistoryDialog__btn WorkspaceHistoryDialog__btn--primary"
            disabled={Boolean(busyPath)}
            onClick={onClose}
          >
            完成
          </button>
        </footer>
      </div>
    </div>
  );
}
