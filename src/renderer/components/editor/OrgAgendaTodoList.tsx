import {
  formatAgendaTime,
  type OrgAgendaItem,
  type OrgAgendaTimestamp,
} from '../../lib/orgAgenda';

interface OrgAgendaTodoListProps {
  items: OrgAgendaItem[];
}

function pickNextTimestamp(item: OrgAgendaItem): OrgAgendaTimestamp | null {
  const scheduled = item.timestamps.find((ts) => ts.kind === 'scheduled');
  if (scheduled) return scheduled;
  const deadline = item.timestamps.find((ts) => ts.kind === 'deadline');
  return deadline ?? null;
}

const TIMESTAMP_LABEL: Record<string, string> = {
  scheduled: '计划',
  deadline: '截止',
};

export default function OrgAgendaTodoList({ items }: OrgAgendaTodoListProps) {
  return (
    <aside className="OrgAgendaTodoList" aria-label="待办列表">
      <header className="OrgAgendaTodoList__header">
        <h2 className="OrgAgendaTodoList__title">待办</h2>
        <span className="OrgAgendaTodoList__count">{items.length}</span>
      </header>
      {items.length === 0 ? (
        <p className="OrgAgendaTodoList__empty">没有未完成的 TODO 条目</p>
      ) : (
        <ul className="OrgAgendaTodoList__entries">
          {items.map((item) => {
            const timestamp = pickNextTimestamp(item);
            return (
              <li
                key={item.id}
                className="OrgAgendaTodoList__entry"
                style={{ paddingLeft: `${(item.depth - 1) * 12 + 8}px` }}
              >
                <div className="OrgAgendaTodoList__entryMain">
                  {item.todoKeyword && (
                    <span className="OrgAgendaTodoList__keyword">
                      {item.todoKeyword}
                    </span>
                  )}
                  {item.priority && (
                    <span className="OrgAgendaTodoList__priority">
                      [{item.priority}]
                    </span>
                  )}
                  <span className="OrgAgendaTodoList__itemTitle">{item.title}</span>
                </div>
                {(timestamp || item.tags.length > 0) && (
                  <div className="OrgAgendaTodoList__meta">
                    {timestamp && (
                      <span
                        className={`OrgAgendaTodoList__timestamp OrgAgendaTodoList__timestamp--${timestamp.kind}`}
                      >
                        {TIMESTAMP_LABEL[timestamp.kind]} {formatAgendaTime(timestamp)}
                      </span>
                    )}
                    {item.tags.length > 0 && (
                      <span className="OrgAgendaTodoList__tags">
                        {item.tags.map((tag) => `:${tag}:`).join('')}
                      </span>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
