import type { EditorTab } from '../../types/tab';
import { tabLabel } from '../../types/tab';

interface TabBarProps {
  tabs: EditorTab[];
  activeTabId: string | null;
  sidebarVisible: boolean;
  onToggleSidebar: () => void;
  onSelect: (tabId: string) => void;
  onClose: (tabId: string) => void;
  onAdd: () => void;
  onOpenSettings: () => void;
}

export default function TabBar({
  tabs,
  activeTabId,
  sidebarVisible,
  onToggleSidebar,
  onSelect,
  onClose,
  onAdd,
  onOpenSettings,
}: TabBarProps) {
  return (
    <div className="TabBar">
      <button
        type="button"
        className={`TabBar__sidebarToggle${sidebarVisible ? ' TabBar__sidebarToggle--active' : ''}`}
        aria-label={sidebarVisible ? '隐藏侧边栏' : '显示侧边栏'}
        aria-pressed={sidebarVisible}
        title={sidebarVisible ? '隐藏侧边栏' : '显示侧边栏'}
        onClick={onToggleSidebar}
      >
        <svg
          className="TabBar__sidebarToggleIcon"
          viewBox="0 0 24 24"
          width="16"
          height="16"
          aria-hidden
        >
          <path
            fill="currentColor"
            d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5zm2 0v14h6V5H5zm8 0v14h6V5h-6z"
          />
        </svg>
      </button>
      <div className="TabBar__list" role="tablist">
        {tabs.map((tab) => {
          const active = tab.id === activeTabId;
          const label = tabLabel(tab);
          return (
            <div
              key={tab.id}
              role="tab"
              tabIndex={0}
              aria-selected={active}
              className={`TabBar__tab${active ? ' TabBar__tab--active' : ''}`}
              onClick={() => onSelect(tab.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onSelect(tab.id);
                }
              }}
            >
              <span className="TabBar__label">
                {tab.dirty ? `${label} *` : label}
              </span>
              <button
                type="button"
                className="TabBar__close"
                aria-label={`关闭 ${label}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(tab.id);
                }}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        className="TabBar__add"
        aria-label="新建标签页"
        onClick={onAdd}
      >
        +
      </button>
      <button
        type="button"
        className="TabBar__settings"
        aria-label="设置"
        title="设置"
        onClick={onOpenSettings}
      >
        <svg
          className="TabBar__settingsIcon"
          viewBox="0 0 24 24"
          width="16"
          height="16"
          aria-hidden
        >
          <path
            fill="currentColor"
            d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97s-.03-.66-.07-1l2.11-1.65a.5.5 0 0 0 .12-.64l-2-3.46a.5.5 0 0 0-.6-.22l-2.49 1a7.06 7.06 0 0 0-1.73-1l-.38-2.65A.5.5 0 0 0 14 2h-4a.5.5 0 0 0-.5.42l-.38 2.65a7.06 7.06 0 0 0-1.73 1l-2.49-1a.5.5 0 0 0-.6.22l-2 3.46a.5.5 0 0 0 .12.64L4.57 11c-.04.32-.07.65-.07.97s.03.66.07 1.01l-2.11 1.65a.5.5 0 0 0-.12.64l2 3.46a.5.5 0 0 0 .6.22l2.49-1c.52.48 1.1.87 1.73 1.15l.38 2.65A.5.5 0 0 0 10 22h4a.5.5 0 0 0 .5-.42l.38-2.65c.63-.28 1.21-.67 1.73-1.15l2.49 1a.5.5 0 0 0 .6-.22l2-3.46a.5.5 0 0 0-.12-.64l-2.11-1.65Z"
          />
        </svg>
      </button>
    </div>
  );
}
