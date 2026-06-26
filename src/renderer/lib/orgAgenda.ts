export type OrgAgendaScope = 'day' | 'week' | 'month';

export type OrgAgendaTimestampKind = 'scheduled' | 'deadline' | 'closed';

export interface OrgAgendaTimestamp {
  kind: OrgAgendaTimestampKind;
  raw: string;
  /** 本地时区午夜 */
  date: Date;
  hasTime: boolean;
  hours: number | null;
  minutes: number | null;
}

export interface OrgAgendaItem {
  id: string;
  title: string;
  todoKeyword: string | null;
  priority: string | null;
  tags: string[];
  depth: number;
  line: number;
  timestamps: OrgAgendaTimestamp[];
}

export interface OrgAgendaDayGroup {
  date: Date;
  entries: OrgAgendaEntry[];
}

export interface OrgAgendaEntry {
  item: OrgAgendaItem;
  timestamp: OrgAgendaTimestamp;
}

export interface OrgAgendaCalendarCell {
  date: Date;
  inMonth: boolean;
  entries: OrgAgendaEntry[];
}

export interface OrgAgendaCalendarWeek {
  cells: OrgAgendaCalendarCell[];
}

export const ORG_AGENDA_WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'] as const;

/** Agenda 右侧待办面板宽度下限 */
export const ORG_AGENDA_TODO_PANEL_MIN_WIDTH = 160;
/** Agenda 右侧待办面板宽度上限 */
export const ORG_AGENDA_TODO_PANEL_MAX_WIDTH = 560;
/** Agenda 主区域保留宽度下限 */
export const ORG_AGENDA_MAIN_MIN_WIDTH = 200;
/** Agenda 右侧待办面板默认占比 */
export const ORG_AGENDA_TODO_PANEL_DEFAULT_RATIO = 1 / 3;

/** 视为未完成、应出现在待办列表中的关键字 */
export const ORG_ACTIVE_TODO_KEYWORDS = new Set([
  'TODO',
  'WAITING',
  'NEXT',
  'HOLD',
]);

const ORG_HEADLINE_RE = /^(\*+)\s+(.+)$/;
const ORG_TAGS_RE = /\s+(:[\w@%#_+-]+:)+\s*$/;
const ORG_PRIORITY_RE = /^\[[^\]]+\]\s+/;
const ORG_TODO_KEYWORD_RE =
  /^(TODO|DONE|WAITING|NEXT|HOLD|CANCELLED|CANCELED|DEFERRED)\s+/;
const ORG_PROPERTY_RE =
  /^\s*(SCHEDULED|DEADLINE|CLOSED):\s*<([^>]+(?:>--<[^>]+)?)>/i;
const ORG_DATE_RE =
  /^(\d{4})-(\d{2})-(\d{2})(?:\s+\S+(?:\s+(\d{1,2}):(\d{2}))?)?/;

function stripOrgHeadlineTitle(raw: string): {
  title: string;
  todoKeyword: string | null;
  priority: string | null;
} {
  let title = raw.trim();
  title = title.replace(ORG_TAGS_RE, '').trim();
  if (title.startsWith('COMMENT ')) {
    title = title.slice('COMMENT '.length).trim();
  }
  const todoMatch = title.match(ORG_TODO_KEYWORD_RE);
  const todoKeyword = todoMatch ? todoMatch[1] : null;
  title = title.replace(ORG_TODO_KEYWORD_RE, '');
  const priorityMatch =
    title.match(/^\[([^\]]+)\]\s+/) ?? title.match(/\s+\[([^\]]+)\]\s*$/);
  const priority = priorityMatch ? priorityMatch[1] : null;
  title = title.replace(ORG_PRIORITY_RE, '').replace(/\s+\[[^\]]+\]\s*$/, '');
  return { title: title.trim(), todoKeyword, priority };
}

function extractOrgTags(raw: string): string[] {
  const match = raw.match(ORG_TAGS_RE);
  if (!match) return [];
  const tags: string[] = [];
  const tagRe = /:([\w@%#_+-]+):/g;
  let tagMatch: RegExpExecArray | null;
  while ((tagMatch = tagRe.exec(match[0])) !== null) {
    tags.push(tagMatch[1]);
  }
  return tags;
}

/** 解析 Org 角括号时间戳，取 active 部分（范围时只用左端） */
export function parseOrgTimestamp(
  raw: string,
): Pick<OrgAgendaTimestamp, 'date' | 'hasTime' | 'hours' | 'minutes'> | null {
  const active = raw.split('--')[0]?.trim() ?? '';
  const match = active.match(ORG_DATE_RE);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year + month + day)) return null;
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  const hours = match[4] != null ? Number(match[4]) : null;
  const minutes = match[5] != null ? Number(match[5]) : null;
  const hasTime = hours != null && minutes != null;
  return { date, hasTime, hours, minutes };
}

/** 从 Org 源码解析带 SCHEDULED / DEADLINE / CLOSED 的条目 */
export function parseOrgAgendaItems(content: string): OrgAgendaItem[] {
  const lines = content.split(/\r?\n/);
  const items: OrgAgendaItem[] = [];
  let current: OrgAgendaItem | null = null;

  lines.forEach((line, index) => {
    if (!/^\s/.test(line)) {
      const headlineMatch = line.match(ORG_HEADLINE_RE);
      if (headlineMatch) {
        const depth = headlineMatch[1].length;
        const rawTitle = headlineMatch[2];
        const { title, todoKeyword, priority } = stripOrgHeadlineTitle(rawTitle);
        if (!title) {
          current = null;
          return;
        }
        current = {
          id: `org-agenda-${index + 1}`,
          title,
          todoKeyword,
          priority,
          tags: extractOrgTags(rawTitle),
          depth,
          line: index + 1,
          timestamps: [],
        };
        items.push(current);
        return;
      }
    }

    const propertyMatch = line.match(ORG_PROPERTY_RE);
    if (!propertyMatch || !current) return;
    const kind = propertyMatch[1].toLowerCase() as OrgAgendaTimestampKind;
    const parsed = parseOrgTimestamp(propertyMatch[2]);
    if (!parsed) return;
    current.timestamps.push({
      kind,
      raw: propertyMatch[2],
      ...parsed,
    });
  });

  return items;
}

export function isActiveOrgTodo(keyword: string | null): boolean {
  return keyword != null && ORG_ACTIVE_TODO_KEYWORDS.has(keyword);
}

/** 收集文档中未完成的 TODO 条目（保持源码顺序） */
export function collectOrgTodoItems(items: OrgAgendaItem[]): OrgAgendaItem[] {
  return items.filter((item) => isActiveOrgTodo(item.todoKeyword));
}

export function getOrgAgendaTodoPanelMaxWidth(containerWidth: number): number {
  if (containerWidth <= 0) return ORG_AGENDA_TODO_PANEL_MAX_WIDTH;
  const dynamicMax = containerWidth - ORG_AGENDA_MAIN_MIN_WIDTH;
  return Math.max(
    ORG_AGENDA_TODO_PANEL_MIN_WIDTH,
    Math.min(ORG_AGENDA_TODO_PANEL_MAX_WIDTH, dynamicMax),
  );
}

export function clampOrgAgendaTodoPanelWidth(
  width: number,
  containerWidth: number,
): number {
  const max = getOrgAgendaTodoPanelMaxWidth(containerWidth);
  return Math.min(max, Math.max(ORG_AGENDA_TODO_PANEL_MIN_WIDTH, Math.round(width)));
}

export function defaultOrgAgendaTodoPanelWidth(containerWidth: number): number {
  return clampOrgAgendaTodoPanelWidth(
    containerWidth * ORG_AGENDA_TODO_PANEL_DEFAULT_RATIO,
    containerWidth,
  );
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return startOfDay(next);
}

export function addMonths(date: Date, months: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth() + months, 1);
  return startOfDay(next);
}

/** 周一为一周起始 */
export function startOfWeek(date: Date): Date {
  const day = startOfDay(date);
  const weekday = (day.getDay() + 6) % 7;
  return addDays(day, -weekday);
}

export function endOfWeek(date: Date): Date {
  return addDays(startOfWeek(date), 6);
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isDateInRange(date: Date, start: Date, end: Date): boolean {
  const value = startOfDay(date).getTime();
  return value >= startOfDay(start).getTime() && value <= startOfDay(end).getTime();
}

export function getAgendaRange(
  scope: OrgAgendaScope,
  anchor: Date,
): { start: Date; end: Date } {
  const day = startOfDay(anchor);
  if (scope === 'day') {
    return { start: day, end: day };
  }
  if (scope === 'week') {
    return { start: startOfWeek(day), end: endOfWeek(day) };
  }
  return { start: startOfMonth(day), end: endOfMonth(day) };
}

export function shiftAgendaAnchor(
  scope: OrgAgendaScope,
  anchor: Date,
  delta: -1 | 1,
): Date {
  if (scope === 'day') return addDays(anchor, delta);
  if (scope === 'week') return addDays(anchor, delta * 7);
  return addMonths(anchor, delta);
}

export function formatAgendaPeriodLabel(
  scope: OrgAgendaScope,
  anchor: Date,
): string {
  const { start, end } = getAgendaRange(scope, anchor);
  const fmt = (date: Date) =>
    `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  const weekday = ['日', '一', '二', '三', '四', '五', '六'];
  if (scope === 'day') {
    const day = startOfDay(anchor);
    return `${fmt(day)} 周${weekday[day.getDay()]}`;
  }
  if (scope === 'week') {
    return `${fmt(start)} – ${fmt(end)}`;
  }
  return `${anchor.getFullYear()}年${anchor.getMonth() + 1}月`;
}

export function formatAgendaDayHeading(date: Date): string {
  const weekday = ['日', '一', '二', '三', '四', '五', '六'];
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} 周${weekday[date.getDay()]}`;
}

export function formatAgendaTime(timestamp: OrgAgendaTimestamp): string {
  if (!timestamp.hasTime) return '全天';
  const hours = String(timestamp.hours ?? 0).padStart(2, '0');
  const minutes = String(timestamp.minutes ?? 0).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function sortAgendaEntries(entries: OrgAgendaEntry[]): OrgAgendaEntry[] {
  return [...entries].sort((a, b) => {
    const dayDiff = a.timestamp.date.getTime() - b.timestamp.date.getTime();
    if (dayDiff !== 0) return dayDiff;
    const aTime = a.timestamp.hasTime
      ? (a.timestamp.hours ?? 0) * 60 + (a.timestamp.minutes ?? 0)
      : -1;
    const bTime = b.timestamp.hasTime
      ? (b.timestamp.hours ?? 0) * 60 + (b.timestamp.minutes ?? 0)
      : -1;
    if (aTime !== bTime) return aTime - bTime;
    const kindOrder = { scheduled: 0, deadline: 1, closed: 2 };
    const kindDiff = kindOrder[a.timestamp.kind] - kindOrder[b.timestamp.kind];
    if (kindDiff !== 0) return kindDiff;
    return a.item.line - b.item.line;
  });
}

export function collectAgendaEntriesInRange(
  items: OrgAgendaItem[],
  start: Date,
  end: Date,
): OrgAgendaEntry[] {
  const entries: OrgAgendaEntry[] = [];
  for (const item of items) {
    for (const timestamp of item.timestamps) {
      if (isDateInRange(timestamp.date, start, end)) {
        entries.push({ item, timestamp });
      }
    }
  }
  return sortAgendaEntries(entries);
}

/** 构建月历网格（含上月/下月补位，周一为一周起始） */
export function buildMonthCalendarGrid(
  items: OrgAgendaItem[],
  anchor: Date,
): OrgAgendaCalendarWeek[] {
  const monthStart = startOfMonth(anchor);
  const monthEnd = endOfMonth(anchor);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);
  const entries = collectAgendaEntriesInRange(items, gridStart, gridEnd);
  const byDay = new Map<number, OrgAgendaEntry[]>();
  for (const entry of entries) {
    const key = startOfDay(entry.timestamp.date).getTime();
    const dayEntries = byDay.get(key);
    if (dayEntries) {
      dayEntries.push(entry);
    } else {
      byDay.set(key, [entry]);
    }
  }

  const weeks: OrgAgendaCalendarWeek[] = [];
  for (let weekStart = gridStart; weekStart <= gridEnd; weekStart = addDays(weekStart, 7)) {
    const cells: OrgAgendaCalendarCell[] = [];
    for (let offset = 0; offset < 7; offset += 1) {
      const date = addDays(weekStart, offset);
      const key = startOfDay(date).getTime();
      cells.push({
        date,
        inMonth:
          date.getMonth() === anchor.getMonth() &&
          date.getFullYear() === anchor.getFullYear(),
        entries: byDay.get(key) ?? [],
      });
    }
    weeks.push({ cells });
  }
  return weeks;
}

export function groupAgendaEntries(
  items: OrgAgendaItem[],
  scope: OrgAgendaScope,
  anchor: Date,
): OrgAgendaDayGroup[] {
  const { start, end } = getAgendaRange(scope, anchor);
  const entries = collectAgendaEntriesInRange(items, start, end);

  const groups = new Map<number, OrgAgendaDayGroup>();
  for (const entry of entries) {
    const key = startOfDay(entry.timestamp.date).getTime();
    let group = groups.get(key);
    if (!group) {
      group = { date: startOfDay(entry.timestamp.date), entries: [] };
      groups.set(key, group);
    }
    group.entries.push(entry);
  }

  if (scope === 'month') {
    const monthStart = startOfMonth(anchor);
    const monthEnd = endOfMonth(anchor);
    const ordered: OrgAgendaDayGroup[] = [];
    for (let cursor = monthStart; cursor <= monthEnd; cursor = addDays(cursor, 1)) {
      const key = cursor.getTime();
      ordered.push(groups.get(key) ?? { date: new Date(cursor), entries: [] });
    }
    return ordered.filter((group) => group.entries.length > 0);
  }

  if (scope === 'week') {
    const ordered: OrgAgendaDayGroup[] = [];
    for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
      const key = cursor.getTime();
      const group = groups.get(key);
      if (group) ordered.push(group);
    }
    return ordered;
  }

  const dayKey = start.getTime();
  const dayGroup = groups.get(dayKey);
  return dayGroup ? [dayGroup] : [];
}
