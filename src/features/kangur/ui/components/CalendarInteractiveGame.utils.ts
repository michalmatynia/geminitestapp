'use client';

import type { KangurAccent } from '@/features/kangur/ui/design/tokens';
import type {
  CalendarInteractiveSectionContent,
  CalendarInteractiveTaskPoolId,
  CalendarInteractiveTranslate,
  Season,
  Task,
} from './CalendarInteractiveGame.types';
import {
  CALENDAR_INTERACTIVE_TASK_TYPE_POOLS,
  MONTHS_DATA,
  SEASONS,
  WEEKDAYS,
} from './CalendarInteractiveGame.constants';

export const seasonDroppableId = (season: Season): string => {
  const index = SEASONS.findIndex((candidate) => candidate.id === season);
  return index >= 0 ? `season-${index}` : 'season-unknown';
};

export const resolveSeasonFromDroppableId = (droppableId: string): Season | null => {
  if (!droppableId.startsWith('season-')) return null;
  const index = Number.parseInt(droppableId.replace('season-', ''), 10);
  return Number.isNaN(index) ? null : (SEASONS[index]?.id ?? null);
};

export function getCalendarInteractiveSectionContent(
  section: CalendarInteractiveTaskPoolId
): CalendarInteractiveSectionContent {
  switch (section) {
    case 'dni':
      return { accent: 'emerald' };
    case 'miesiace':
      return { accent: 'amber' };
    case 'data':
      return { accent: 'indigo' };
    default:
      return { accent: 'emerald' };
  }
}

export function getCalendarCells(month: number, year: number): Array<number | null> {
  const firstDay = new Date(year, month, 1).getDay();
  const offset = (firstDay + 6) % 7; // Monday = 0
  const monthData = MONTHS_DATA[month] ?? MONTHS_DATA[0];
  const cells: Array<number | null> = [];

  for (let i = 0; i < offset; i += 1) {
    cells.push(null);
  }
  for (let day = 1; day <= monthData.days; day += 1) {
    cells.push(day);
  }

  return cells;
}

export function getDayOfWeek(year: number, month: number, day: number): number {
  const jsDay = new Date(year, month, day).getDay();
  return (jsDay + 6) % 7;
}

export const getCalendarInteractiveMonthName = (
  translate: CalendarInteractiveTranslate,
  month: number
): string =>
  translate(`calendarInteractive.months.${MONTHS_DATA[month]?.id ?? MONTHS_DATA[0].id}`);

export const getCalendarInteractiveWeekdayFull = (
  translate: CalendarInteractiveTranslate,
  dayIdx: number
): string =>
  translate(`calendarInteractive.weekdays.full.${WEEKDAYS[dayIdx]?.full ?? WEEKDAYS[0].full}`);

export const getCalendarInteractiveWeekdayLookup = (
  translate: CalendarInteractiveTranslate,
  dayIdx: number
): string =>
  translate(`calendarInteractive.weekdays.lookup.${WEEKDAYS[dayIdx]?.lookup ?? WEEKDAYS[0].lookup}`);

export const getCalendarInteractiveSeasonLabel = (
  translate: CalendarInteractiveTranslate,
  season: Season
): string => translate(`calendarInteractive.seasons.${season}`);

export function generateTask(
  month: number,
  year: number,
  translate: CalendarInteractiveTranslate,
  section: CalendarInteractiveTaskPoolId = 'mixed'
): Task {
  const taskTypes = CALENDAR_INTERACTIVE_TASK_TYPE_POOLS[section];
  const type =
    taskTypes[Math.floor(Math.random() * taskTypes.length)] ??
    CALENDAR_INTERACTIVE_TASK_TYPE_POOLS.mixed[0];
  const cells = getCalendarCells(month, year);
  const validDays = cells.filter((day): day is number => day !== null);

  if (type === 'click_weekday_name') {
    const targetIdx = Math.floor(Math.random() * 7);
    return {
      type: 'click_weekday_name',
      targetIdx,
      label: translate('calendarInteractive.inRound.tasks.clickWeekday', {
        name: getCalendarInteractiveWeekdayLookup(translate, targetIdx),
      }),
    };
  }

  if (type === 'click_all_weekends') {
    const dayIdx: 5 | 6 = Math.random() > 0.5 ? 5 : 6;
    const targets = cells
      .map((day, idx) => (day !== null && getDayOfWeek(year, month, day) === dayIdx ? day : null))
      .filter((day): day is number => day !== null);
    return {
      type: 'click_all_weekends',
      targets,
      dayIdx,
      label: translate('calendarInteractive.inRound.tasks.clickAllWeekends', {
        name: getCalendarInteractiveWeekdayLookup(translate, dayIdx),
      }),
    };
  }

  if (type === 'drag_season') {
    const monthData = MONTHS_DATA[month] ?? MONTHS_DATA[0];
    return {
      type: 'drag_season',
      monthName: getCalendarInteractiveMonthName(translate, month),
      correctSeason: monthData.season,
      label: translate('calendarInteractive.inRound.tasks.dragSeason', {
        name: getCalendarInteractiveMonthName(translate, month),
      }),
    };
  }

  if (type === 'flip_month') {
    const targetMonth = Math.floor(Math.random() * 12);
    return {
      type: 'flip_month',
      targetMonth,
      label: translate('calendarInteractive.inRound.tasks.flipMonth', {
        name: getCalendarInteractiveMonthName(translate, targetMonth),
      }),
    };
  }

  const targetDay = validDays[Math.floor(Math.random() * validDays.length)] ?? 1;
  return {
    type: 'click_date',
    targetDay,
    month,
    year,
    label: translate('calendarInteractive.inRound.tasks.clickDate', {
      day: targetDay,
      month: getCalendarInteractiveMonthName(translate, month),
    }),
  };
}
