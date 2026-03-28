'use client';

import type { KangurAccent } from '@/features/kangur/ui/design/tokens';
import type { CalendarInteractiveTaskPoolId, TaskType, Season } from './CalendarInteractiveGame.types';

export const MONTHS_DATA = [
  { id: 'january', days: 31, season: 'winter' },
  { id: 'february', days: 28, season: 'winter' },
  { id: 'march', days: 31, season: 'spring' },
  { id: 'april', days: 30, season: 'spring' },
  { id: 'may', days: 31, season: 'spring' },
  { id: 'june', days: 30, season: 'summer' },
  { id: 'july', days: 31, season: 'summer' },
  { id: 'august', days: 31, season: 'summer' },
  { id: 'september', days: 30, season: 'autumn' },
  { id: 'october', days: 31, season: 'autumn' },
  { id: 'november', days: 30, season: 'autumn' },
  { id: 'december', days: 31, season: 'winter' },
] as const;

export const WEEKDAYS = [
  { id: 'monday', short: 'mondayShort', abbr: 'mondayAbbr', full: 'monday', lookup: 'monday' },
  { id: 'tuesday', short: 'tuesdayShort', abbr: 'tuesdayAbbr', full: 'tuesday', lookup: 'tuesday' },
  { id: 'wednesday', short: 'wednesdayShort', abbr: 'wednesdayAbbr', full: 'wednesday', lookup: 'wednesday' },
  { id: 'thursday', short: 'thursdayShort', abbr: 'thursdayAbbr', full: 'thursday', lookup: 'thursday' },
  { id: 'friday', short: 'fridayShort', abbr: 'fridayAbbr', full: 'friday', lookup: 'friday' },
  { id: 'saturday', short: 'saturdayShort', abbr: 'saturdayAbbr', full: 'saturday', lookup: 'saturday' },
  { id: 'sunday', short: 'sundayShort', abbr: 'sundayAbbr', full: 'sunday', lookup: 'sunday' },
] as const;

export const SEASONS = [
  { id: 'spring', emoji: '🌸', accent: 'emerald' },
  { id: 'summer', emoji: '☀️', accent: 'amber' },
  { id: 'autumn', emoji: '🍂', accent: 'rose' },
  { id: 'winter', emoji: '❄️', accent: 'sky' },
] as const satisfies ReadonlyArray<{ id: Season; emoji: string; accent: KangurAccent }>;

export const SEASON_ACCENTS: Record<Season, KangurAccent> = {
  spring: 'emerald',
  summer: 'amber',
  autumn: 'rose',
  winter: 'sky',
};

export const CALENDAR_INTERACTIVE_TASK_TYPE_POOLS: Record<
  CalendarInteractiveTaskPoolId,
  readonly TaskType[]
> = {
  mixed: ['click_weekday_name', 'click_date', 'drag_season', 'flip_month', 'click_all_weekends'],
  dni: ['click_weekday_name', 'click_all_weekends'],
  miesiace: ['drag_season', 'flip_month'],
  data: ['click_date'],
};
