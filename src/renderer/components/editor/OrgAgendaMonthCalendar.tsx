import { useMemo } from 'react';
import {
  ORG_AGENDA_WEEKDAY_LABELS,
  buildMonthCalendarGrid,
  formatAgendaTime,
  isSameDay,
  startOfDay,
  type OrgAgendaEntry,
  type OrgAgendaItem,
} from '../../lib/orgAgenda';

interface OrgAgendaMonthCalendarProps {
  items: OrgAgendaItem[];
  anchor: Date;
  today: Date;
  onSelectDay: (date: Date) => void;
}

const MAX_VISIBLE_ENTRIES = 3;

function formatCalendarChip(entry: OrgAgendaEntry): string {
  const time = formatAgendaTime(entry.timestamp);
  const prefix = time === '全天' ? '' : `${time} `;
  return `${prefix}${entry.item.title}`;
}

export default function OrgAgendaMonthCalendar({
  items,
  anchor,
  today,
  onSelectDay,
}: OrgAgendaMonthCalendarProps) {
  const weeks = useMemo(
    () => buildMonthCalendarGrid(items, anchor),
    [items, anchor],
  );

  return (
    <div className="OrgAgendaCalendar" role="grid" aria-label="月历">
      <div className="OrgAgendaCalendar__weekdays" role="row">
        {ORG_AGENDA_WEEKDAY_LABELS.map((label) => (
          <div key={label} className="OrgAgendaCalendar__weekday" role="columnheader">
            {label}
          </div>
        ))}
      </div>
      {weeks.map((week) => (
        <div
          key={week.cells[0]?.date.getTime()}
          className="OrgAgendaCalendar__week"
          role="row"
        >
          {week.cells.map((cell) => {
            const isToday = isSameDay(cell.date, today);
            const hiddenCount = Math.max(0, cell.entries.length - MAX_VISIBLE_ENTRIES);
            return (
              <button
                key={cell.date.getTime()}
                type="button"
                className={`OrgAgendaCalendar__cell${cell.inMonth ? '' : ' OrgAgendaCalendar__cell--outside'}${isToday ? ' OrgAgendaCalendar__cell--today' : ''}`}
                role="gridcell"
                aria-label={`${cell.date.getMonth() + 1}月${cell.date.getDate()}日`}
                onClick={() => onSelectDay(startOfDay(cell.date))}
              >
                <span className="OrgAgendaCalendar__dayNum">{cell.date.getDate()}</span>
                <div className="OrgAgendaCalendar__entries">
                  {cell.entries.slice(0, MAX_VISIBLE_ENTRIES).map((entry) => (
                    <span
                      key={`${entry.item.id}-${entry.timestamp.kind}-${entry.timestamp.raw}`}
                      className={`OrgAgendaCalendar__chip OrgAgendaCalendar__chip--${entry.timestamp.kind}`}
                      title={formatCalendarChip(entry)}
                    >
                      {formatCalendarChip(entry)}
                    </span>
                  ))}
                  {hiddenCount > 0 && (
                    <span className="OrgAgendaCalendar__more">+{hiddenCount}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
