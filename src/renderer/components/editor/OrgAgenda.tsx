import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHorizontalDragSize } from '../../hooks/useHorizontalDragSize';
import {
  clampOrgAgendaTodoPanelWidth,
  collectOrgTodoItems,
  defaultOrgAgendaTodoPanelWidth,
  formatAgendaDayHeading,
  formatAgendaPeriodLabel,
  formatAgendaTime,
  getOrgAgendaTodoPanelMaxWidth,
  groupAgendaEntries,
  isSameDay,
  ORG_AGENDA_TODO_PANEL_MIN_WIDTH,
  parseOrgAgendaItems,
  shiftAgendaAnchor,
  startOfDay,
  type OrgAgendaScope,
} from '../../lib/orgAgenda';
import type { EditorTab } from '../../types/tab';
import OrgAgendaMonthCalendar from './OrgAgendaMonthCalendar';
import OrgAgendaTodoList from './OrgAgendaTodoList';

interface OrgAgendaProps {
  tab: EditorTab;
}

const SCOPE_OPTIONS: { id: OrgAgendaScope; label: string }[] = [
  { id: 'day', label: '日' },
  { id: 'week', label: '周' },
  { id: 'month', label: '月' },
];

const TIMESTAMP_LABEL: Record<string, string> = {
  scheduled: '计划',
  deadline: '截止',
  closed: '完成',
};

export default function OrgAgenda({ tab }: OrgAgendaProps) {
  const [scope, setScope] = useState<OrgAgendaScope>('day');
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [showTodoPanel, setShowTodoPanel] = useState(true);
  const [todoPanelWidth, setTodoPanelWidth] = useState<number | null>(null);

  const contentRef = useRef<HTMLDivElement>(null);
  const todoPanelRef = useRef<HTMLDivElement>(null);

  const items = useMemo(() => parseOrgAgendaItems(tab.content), [tab.content]);
  const todoItems = useMemo(() => collectOrgTodoItems(items), [items]);
  const groups = useMemo(
    () => (scope === 'month' ? [] : groupAgendaEntries(items, scope, anchor)),
    [items, scope, anchor],
  );
  const periodLabel = useMemo(
    () => formatAgendaPeriodLabel(scope, anchor),
    [scope, anchor],
  );
  const today = startOfDay(new Date());
  const isToday = isSameDay(anchor, today);

  const clampTodoWidth = useCallback((next: number) => {
    const containerWidth = contentRef.current?.clientWidth ?? 0;
    return clampOrgAgendaTodoPanelWidth(next, containerWidth);
  }, []);

  const resolveTodoMax = useCallback(() => {
    const containerWidth = contentRef.current?.clientWidth ?? 0;
    return getOrgAgendaTodoPanelMaxWidth(containerWidth);
  }, []);

  const handleTodoWidthChange = useCallback(
    (next: number) => {
      setTodoPanelWidth(clampTodoWidth(next));
    },
    [clampTodoWidth],
  );

  const { dragging: resizingTodo, handleProps: todoResizeHandleProps } =
    useHorizontalDragSize({
      value: todoPanelWidth ?? ORG_AGENDA_TODO_PANEL_MIN_WIDTH,
      min: ORG_AGENDA_TODO_PANEL_MIN_WIDTH,
      max: resolveTodoMax(),
      resolveMax: resolveTodoMax,
      onChange: handleTodoWidthChange,
      liveTargetRef: todoPanelRef,
      invertDelta: true,
      ariaLabel: '调整待办面板宽度',
    });

  useEffect(() => {
    const container = contentRef.current;
    if (!container) return undefined;

    const syncWidth = () => {
      setTodoPanelWidth((current) => {
        const width = container.clientWidth;
        if (width <= 0) return current;
        if (current == null) {
          return defaultOrgAgendaTodoPanelWidth(width);
        }
        return clampOrgAgendaTodoPanelWidth(current, width);
      });
    };

    syncWidth();
    const observer = new ResizeObserver(syncWidth);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const handleSelectDay = (date: Date) => {
    setAnchor(date);
    setScope('day');
  };

  const agendaBody = (
    <div
      className={`OrgAgenda__body${scope === 'month' ? ' OrgAgenda__body--calendar' : ''}`}
    >
      {scope === 'month' ? (
        <OrgAgendaMonthCalendar
          items={items}
          anchor={anchor}
          today={today}
          onSelectDay={handleSelectDay}
        />
      ) : groups.length === 0 ? (
        <p className="OrgAgenda__empty">该时段没有 SCHEDULED / DEADLINE 条目</p>
      ) : (
        groups.map((group) => (
          <section key={group.date.getTime()} className="OrgAgenda__day">
            {scope !== 'day' && (
              <h3 className="OrgAgenda__dayHeading">
                {formatAgendaDayHeading(group.date)}
              </h3>
            )}
            <ul className="OrgAgenda__entries">
              {group.entries.map((entry) => (
                <li
                  key={`${entry.item.id}-${entry.timestamp.kind}-${entry.timestamp.raw}`}
                  className={`OrgAgenda__entry OrgAgenda__entry--${entry.timestamp.kind}`}
                >
                  <span className="OrgAgenda__time">
                    {formatAgendaTime(entry.timestamp)}
                  </span>
                  <span className="OrgAgenda__kind">
                    {TIMESTAMP_LABEL[entry.timestamp.kind]}
                  </span>
                  {entry.item.todoKeyword && (
                    <span className="OrgAgenda__todo">{entry.item.todoKeyword}</span>
                  )}
                  {entry.item.priority && (
                    <span className="OrgAgenda__priority">[{entry.item.priority}]</span>
                  )}
                  <span className="OrgAgenda__title">{entry.item.title}</span>
                  {entry.item.tags.length > 0 && (
                    <span className="OrgAgenda__tags">
                      {entry.item.tags.map((tag) => `:${tag}:`).join('')}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );

  return (
    <div className="OrgAgenda">
      <div className="OrgAgenda__toolbar">
        <div className="EditorViewSwitch OrgAgenda__scopeSwitch" role="group" aria-label="Agenda 范围">
          {SCOPE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`EditorViewSwitch__btn${scope === option.id ? ' EditorViewSwitch__btn--active' : ''}`}
              onClick={() => setScope(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="OrgAgenda__nav">
          <button
            type="button"
            className="OrgAgenda__navBtn"
            aria-label="上一段"
            onClick={() => setAnchor((prev) => shiftAgendaAnchor(scope, prev, -1))}
          >
            ‹
          </button>
          <span className="OrgAgenda__period">{periodLabel}</span>
          <button
            type="button"
            className="OrgAgenda__navBtn"
            aria-label="下一段"
            onClick={() => setAnchor((prev) => shiftAgendaAnchor(scope, prev, 1))}
          >
            ›
          </button>
          {!isToday && (
            <button
              type="button"
              className="OrgAgenda__todayBtn"
              onClick={() => setAnchor(today)}
            >
              今天
            </button>
          )}
          <button
            type="button"
            className={`OrgAgenda__todoToggle${showTodoPanel ? ' OrgAgenda__todoToggle--active' : ''}`}
            aria-pressed={showTodoPanel}
            aria-label={showTodoPanel ? '隐藏待办列表' : '显示待办列表'}
            onClick={() => setShowTodoPanel((prev) => !prev)}
          >
            待办
            {todoItems.length > 0 && (
              <span className="OrgAgenda__todoToggleCount">{todoItems.length}</span>
            )}
          </button>
        </div>
      </div>
      <div
        ref={contentRef}
        className={`OrgAgenda__content${resizingTodo ? ' OrgAgenda__content--resizing' : ''}`}
      >
        <div className="OrgAgenda__main">{agendaBody}</div>
        {showTodoPanel && todoPanelWidth != null ? (
          <>
            <div
              className={`OrgAgenda__resize${resizingTodo ? ' OrgAgenda__resize--active' : ''}`}
              {...todoResizeHandleProps}
            />
            <div
              ref={todoPanelRef}
              className="OrgAgenda__todoPanel"
              style={{ width: todoPanelWidth }}
            >
              <OrgAgendaTodoList items={todoItems} />
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
