import {
  buildMonthCalendarGrid,
  clampOrgAgendaTodoPanelWidth,
  collectOrgTodoItems,
  defaultOrgAgendaTodoPanelWidth,
  formatAgendaPeriodLabel,
  groupAgendaEntries,
  parseOrgAgendaItems,
  parseOrgTimestamp,
  startOfDay,
} from '../renderer/lib/orgAgenda';

describe('parseOrgTimestamp', () => {
  it('parses date-only timestamps', () => {
    const parsed = parseOrgTimestamp('2025-06-25 Wed');
    expect(parsed).not.toBeNull();
    expect(parsed?.date.getFullYear()).toBe(2025);
    expect(parsed?.date.getMonth()).toBe(5);
    expect(parsed?.date.getDate()).toBe(25);
    expect(parsed?.hasTime).toBe(false);
  });

  it('parses timestamps with time', () => {
    const parsed = parseOrgTimestamp('2025-06-25 Wed 14:30');
    expect(parsed?.hasTime).toBe(true);
    expect(parsed?.hours).toBe(14);
    expect(parsed?.minutes).toBe(30);
  });

  it('uses active side of a range', () => {
    const parsed = parseOrgTimestamp('2025-06-25 Wed>--<2025-06-30 Mon>');
    expect(parsed?.date.getDate()).toBe(25);
  });
});

describe('parseOrgAgendaItems', () => {
  const content = [
    '* TODO Fix release :work:',
    'SCHEDULED: <2025-06-25 Wed 10:00>',
    'DEADLINE: <2025-06-30 Mon>',
    '** DONE Write docs [#A]',
    '  SCHEDULED: <2025-06-26 Thu>',
    '* Plain heading without dates',
  ].join('\n');

  it('collects timestamps under headlines', () => {
    const items = parseOrgAgendaItems(content);
    expect(items).toHaveLength(3);
    expect(items[0].title).toBe('Fix release');
    expect(items[0].todoKeyword).toBe('TODO');
    expect(items[0].tags).toEqual(['work']);
    expect(items[0].timestamps).toHaveLength(2);
    expect(items[0].timestamps[0].kind).toBe('scheduled');
    expect(items[1].title).toBe('Write docs');
    expect(items[1].priority).toBe('#A');
    expect(items[1].timestamps).toHaveLength(1);
    expect(items[2].timestamps).toHaveLength(0);
  });
});

describe('collectOrgTodoItems', () => {
  const content = [
    '* TODO Active task',
    '* DONE Finished task',
    '* WAITING Blocked task',
    '* Plain heading',
    '* CANCELLED Dropped task',
  ].join('\n');

  it('keeps only active todo keywords', () => {
    const items = parseOrgAgendaItems(content);
    const todos = collectOrgTodoItems(items);
    expect(todos.map((item) => item.title)).toEqual([
      'Active task',
      'Blocked task',
    ]);
  });
});

describe('clampOrgAgendaTodoPanelWidth', () => {
  it('defaults to one third of the container', () => {
    expect(defaultOrgAgendaTodoPanelWidth(900)).toBe(300);
  });

  it('clamps to min and max widths', () => {
    expect(clampOrgAgendaTodoPanelWidth(80, 900)).toBe(160);
    expect(clampOrgAgendaTodoPanelWidth(900, 900)).toBe(560);
    expect(clampOrgAgendaTodoPanelWidth(300, 900)).toBe(300);
  });

  it('respects main area minimum width', () => {
    expect(clampOrgAgendaTodoPanelWidth(400, 320)).toBe(160);
  });
});

describe('groupAgendaEntries', () => {
  const content = [
    '* One',
    'SCHEDULED: <2025-06-25 Wed 09:00>',
    '* Two',
    'DEADLINE: <2025-06-27 Fri>',
    '* Three',
    'SCHEDULED: <2025-07-01 Tue>',
  ].join('\n');
  const items = parseOrgAgendaItems(content);
  const anchor = startOfDay(new Date(2025, 5, 25));

  it('groups entries for a single day', () => {
    const groups = groupAgendaEntries(items, 'day', anchor);
    expect(groups).toHaveLength(1);
    expect(groups[0].entries).toHaveLength(1);
    expect(groups[0].entries[0].item.title).toBe('One');
  });

  it('groups entries across a week', () => {
    const groups = groupAgendaEntries(items, 'week', anchor);
    expect(groups).toHaveLength(2);
    expect(groups[0].entries[0].item.title).toBe('One');
    expect(groups[1].entries[0].item.title).toBe('Two');
  });

  it('groups entries within a month', () => {
    const groups = groupAgendaEntries(items, 'month', anchor);
    expect(groups).toHaveLength(2);
    expect(groups[0].entries[0].item.title).toBe('One');
    expect(groups[1].entries[0].item.title).toBe('Two');
  });

  it('formats period labels', () => {
    expect(formatAgendaPeriodLabel('day', anchor)).toContain('2025年6月25日');
    expect(formatAgendaPeriodLabel('month', anchor)).toBe('2025年6月');
  });
});

describe('buildMonthCalendarGrid', () => {
  const content = [
    '* One',
    'SCHEDULED: <2025-06-25 Wed 09:00>',
    '* Two',
    'DEADLINE: <2025-06-27 Fri>',
  ].join('\n');
  const items = parseOrgAgendaItems(content);
  const anchor = startOfDay(new Date(2025, 5, 1));

  it('builds full weeks with padding days', () => {
    const weeks = buildMonthCalendarGrid(items, anchor);
    expect(weeks.length).toBeGreaterThanOrEqual(5);
    expect(weeks[0].cells).toHaveLength(7);
    expect(weeks.every((week) => week.cells.length === 7)).toBe(true);
  });

  it('marks in-month vs outside days', () => {
    const weeks = buildMonthCalendarGrid(items, anchor);
    const juneCells = weeks.flatMap((week) => week.cells).filter((cell) => cell.inMonth);
    expect(juneCells).toHaveLength(30);
    expect(juneCells.some((cell) => cell.date.getDate() === 25)).toBe(true);
  });

  it('places entries on the correct day cells', () => {
    const weeks = buildMonthCalendarGrid(items, anchor);
    const day25 = weeks
      .flatMap((week) => week.cells)
      .find((cell) => cell.inMonth && cell.date.getDate() === 25);
    expect(day25?.entries[0]?.item.title).toBe('One');
  });
});
