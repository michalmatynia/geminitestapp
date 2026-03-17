import { z } from 'zod';

/**
 * Valid Kangur widget IDs that can be embedded in CMS pages.
 */
export const KANGUR_WIDGET_IDS = [
  'game-screen',
  'active-lesson-panel',
  'lessons-catalog',
  'calendar-training',
  'geometry-training',
  'priority-assignments',
  'assignment-spotlight',
] as const;

export type KangurWidgetId = (typeof KANGUR_WIDGET_IDS)[number];

export const kangurWidgetIdSchema = z.enum(KANGUR_WIDGET_IDS);

/**
 * Options for the CMS block selector.
 */
export const KANGUR_WIDGET_OPTIONS: Array<{ label: string; value: KangurWidgetId }> = [
  { label: 'Game screen', value: 'game-screen' },
  { label: 'Active lesson panel', value: 'active-lesson-panel' },
  { label: 'Lessons catalog', value: 'lessons-catalog' },
  { label: 'Calendar training', value: 'calendar-training' },
  { label: 'Geometry training', value: 'geometry-training' },
  { label: 'Priority assignments', value: 'priority-assignments' },
  { label: 'Assignment spotlight', value: 'assignment-spotlight' },
];

/**
 * Helper to resolve a human-readable label for a widget ID.
 */
export const getKangurWidgetLabel = (widgetId: string | null | undefined): string => {
  if (!widgetId) return 'Kangur widget';
  const option = KANGUR_WIDGET_OPTIONS.find((o) => o.value === widgetId);
  return option ? option.label : `Kangur: ${widgetId}`;
};
