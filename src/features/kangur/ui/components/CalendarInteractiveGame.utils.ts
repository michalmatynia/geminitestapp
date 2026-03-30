'use client';

import type { KangurMiniGameTranslate } from '@/features/kangur/ui/constants/mini-game-i18n';

import type {
  CalendarInteractiveSectionContent,
  CalendarInteractiveTaskPoolId,
  TaskType,
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
  translate: KangurMiniGameTranslate,
  month: number
): string =>
  translate(`calendarInteractive.months.${MONTHS_DATA[month]?.id ?? MONTHS_DATA[0].id}`);

export const getCalendarInteractiveWeekdayFull = (
  translate: KangurMiniGameTranslate,
  dayIdx: number
): string =>
  translate(`calendarInteractive.weekdays.full.${WEEKDAYS[dayIdx]?.full ?? WEEKDAYS[0].full}`);

export const getCalendarInteractiveWeekdayShort = (
  translate: KangurMiniGameTranslate,
  dayIdx: number
): string =>
  translate(`calendarInteractive.weekdays.short.${WEEKDAYS[dayIdx]?.short ?? WEEKDAYS[0].short}`);

export const getCalendarInteractiveWeekdayAbbr = (
  translate: KangurMiniGameTranslate,
  dayIdx: number
): string =>
  translate(`calendarInteractive.weekdays.abbr.${WEEKDAYS[dayIdx]?.abbr ?? WEEKDAYS[0].abbr}`);

export const getCalendarInteractiveWeekdayLookup = (
  translate: KangurMiniGameTranslate,
  dayIdx: number
): string =>
  translate(`calendarInteractive.weekdays.lookup.${WEEKDAYS[dayIdx]?.lookup ?? WEEKDAYS[0].lookup}`);

export const getCalendarInteractiveSeasonLabel = (
  translate: KangurMiniGameTranslate,
  season: Season
): string => translate(`calendarInteractive.seasons.${season}`);

const resolveCalendarInteractiveTaskType = (
  section: CalendarInteractiveTaskPoolId
): TaskType => {
  const taskTypes = CALENDAR_INTERACTIVE_TASK_TYPE_POOLS[section];
  const fallbackTaskType: TaskType = 'click_weekday_name';
  return taskTypes[Math.floor(Math.random() * taskTypes.length)] ?? fallbackTaskType;
};

const buildCalendarInteractiveClickWeekdayTask = (
  translate: KangurMiniGameTranslate
): Task => {
  const targetIdx = Math.floor(Math.random() * 7);
  return {
    type: 'click_weekday_name',
    targetIdx,
    label: translate('calendarInteractive.tasks.clickWeekday', {
      dayLabel: getCalendarInteractiveWeekdayLookup(translate, targetIdx),
    }),
  };
};

const buildCalendarInteractiveClickAllWeekendsTask = ({
  cells,
  month,
  translate,
  year,
}: {
  cells: Array<number | null>;
  month: number;
  translate: KangurMiniGameTranslate;
  year: number;
}): Task => {
  const dayIdx: 5 | 6 = Math.random() > 0.5 ? 5 : 6;
  const targets = cells
    .map((day) => (day !== null && getDayOfWeek(year, month, day) === dayIdx ? day : null))
    .filter((day): day is number => day !== null);

  return {
    type: 'click_all_weekends',
    targets,
    dayIdx,
    label: translate('calendarInteractive.tasks.clickAllWeekends', {
      dayName: getCalendarInteractiveWeekdayLookup(translate, dayIdx),
    }),
  };
};

const buildCalendarInteractiveDragSeasonTask = ({
  month,
  translate,
}: {
  month: number;
  translate: KangurMiniGameTranslate;
}): Task => {
  const monthData = MONTHS_DATA[month] ?? MONTHS_DATA[0];
  const monthName = getCalendarInteractiveMonthName(translate, month);

  return {
    type: 'drag_season',
    monthName,
    correctSeason: monthData.season,
    label: translate('calendarInteractive.tasks.dragSeason', {
      monthName,
    }),
  };
};

const buildCalendarInteractiveFlipMonthTask = (
  translate: KangurMiniGameTranslate
): Task => {
  const targetMonth = Math.floor(Math.random() * 12);
  return {
    type: 'flip_month',
    targetMonth,
    label: translate('calendarInteractive.tasks.flipMonth', {
      monthNumber: targetMonth + 1,
      monthName: getCalendarInteractiveMonthName(translate, targetMonth),
    }),
  };
};

const buildCalendarInteractiveClickDateTask = ({
  month,
  translate,
  validDays,
  year,
}: {
  month: number;
  translate: KangurMiniGameTranslate;
  validDays: number[];
  year: number;
}): Task => {
  const targetDay = validDays[Math.floor(Math.random() * validDays.length)] ?? 1;

  return {
    type: 'click_date',
    targetDay,
    month,
    year,
    label: translate('calendarInteractive.tasks.clickDate', {
      weekdayName: getCalendarInteractiveWeekdayFull(
        translate,
        getDayOfWeek(year, month, targetDay)
      ),
    }),
  };
};

export function generateTask(
  month: number,
  year: number,
  translate: KangurMiniGameTranslate,
  section: CalendarInteractiveTaskPoolId = 'mixed'
): Task {
  const type = resolveCalendarInteractiveTaskType(section);
  const cells = getCalendarCells(month, year);
  const validDays = cells.filter((day): day is number => day !== null);

  switch (type) {
    case 'click_weekday_name':
      return buildCalendarInteractiveClickWeekdayTask(translate);
    case 'click_all_weekends':
      return buildCalendarInteractiveClickAllWeekendsTask({
        cells,
        month,
        translate,
        year,
      });
    case 'drag_season':
      return buildCalendarInteractiveDragSeasonTask({
        month,
        translate,
      });
    case 'flip_month':
      return buildCalendarInteractiveFlipMonthTask(translate);
    case 'click_date':
    default:
      return buildCalendarInteractiveClickDateTask({
        month,
        translate,
        validDays,
        year,
      });
  }
}
