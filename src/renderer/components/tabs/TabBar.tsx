import type { EditorTab } from '../../types/tab';
import { tabLabel } from '../../types/tab';

interface TabBarProps {
  tabs: EditorTab[];
  activeTabId: string | null;
  onSelect: (tabId: string) => void;
  onClose: (tabId: string) => void;
  onAdd: () => void;
}

export default function TabBar({
  tabs,
  activeTabId,
  onSelect,
  onClose,
  onAdd,
}: TabBarProps) {
  return (
    <div className="TabBar">
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
    </div>
  );
}
