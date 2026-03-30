import { z } from 'zod';
import type { LabeledOptionDto } from './base';

/**
 * Valid Kangur widget IDs that can be embedded in CMS pages.
 */
export const KANGUR_WIDGET_IDS = [
  'game-screen',
  'game-navigation',
  'game-xp-toast',
  'game-home-hero',
  'game-home-actions',
  'game-training-setup',
  'game-kangur-setup',
  'game-kangur-session',
  'game-calendar-training',
  'game-geometry-training',
  'game-operation-selector',
  'game-question-session',
  'game-result-summary',
  'lessons-screen',
  'learner-profile-screen',
  'parent-dashboard-screen',
  'lesson-catalog',
  'active-lesson-panel',
  'lesson-navigation',
  'learner-profile-hero',
  'learner-profile-level-progress',
  'learner-profile-overview',
  'learner-profile-results',
  'learner-profile-recommendations',
  'learner-profile-assignments',
  'learner-profile-mastery',
  'learner-profile-performance',
  'learner-profile-sessions',
  'parent-dashboard-hero',
  'parent-dashboard-learner-management',
  'parent-dashboard-tabs',
  'parent-dashboard-progress',
  'parent-dashboard-scores',
  'parent-dashboard-assignments',
  'parent-dashboard-monitoring',
  'player-progress',
  'leaderboard',
  'priority-assignments',
  'assignment-spotlight',
] as const;

export type KangurWidgetId = (typeof KANGUR_WIDGET_IDS)[number];

export const kangurWidgetIdSchema = z.enum(KANGUR_WIDGET_IDS);

export const KANGUR_HIDDEN_WIDGET_IDS = ['game-home-hero'] as const satisfies readonly KangurWidgetId[];
export const KANGUR_LEGACY_WIDGET_IDS = ['parent-dashboard-scores'] as const satisfies readonly KangurWidgetId[];

const KANGUR_WIDGET_LABELS_BY_ID: Record<KangurWidgetId, string> = {
  'game-screen': 'Game Screen',
  'game-navigation': 'Game Navigation',
  'game-xp-toast': 'Game XP Toast',
  'game-home-hero': 'Game Home Hero',
  'game-home-actions': 'Game Home Actions',
  'game-training-setup': 'Game Training Setup',
  'game-kangur-setup': 'Game Kangur Setup',
  'game-kangur-session': 'Game Kangur Session',
  'game-calendar-training': 'Game Calendar Training',
  'game-geometry-training': 'Game Geometry Training',
  'game-operation-selector': 'Game Operation Selector',
  'game-question-session': 'Game Question Session',
  'game-result-summary': 'Game Result Summary',
  'lessons-screen': 'Lessons Screen',
  'learner-profile-screen': 'Learner Profile Screen',
  'parent-dashboard-screen': 'Parent Dashboard Screen',
  'lesson-catalog': 'Lesson Catalog',
  'active-lesson-panel': 'Active Lesson Panel',
  'lesson-navigation': 'Lesson Navigation',
  'learner-profile-hero': 'Learner Profile Hero',
  'learner-profile-level-progress': 'Learner Profile Level Progress',
  'learner-profile-overview': 'Learner Profile Overview',
  'learner-profile-results': 'Learner Profile Results',
  'learner-profile-recommendations': 'Learner Profile Recommendations',
  'learner-profile-assignments': 'Learner Profile Assignments',
  'learner-profile-mastery': 'Learner Profile Mastery',
  'learner-profile-performance': 'Learner Profile Performance',
  'learner-profile-sessions': 'Learner Profile Sessions',
  'parent-dashboard-hero': 'Parent Dashboard Hero',
  'parent-dashboard-learner-management': 'Parent Dashboard Learner Management',
  'parent-dashboard-tabs': 'Parent Dashboard Tabs',
  'parent-dashboard-progress': 'Parent Dashboard Progress',
  'parent-dashboard-scores': 'Parent Dashboard Scores',
  'parent-dashboard-assignments': 'Parent Dashboard Assignments',
  'parent-dashboard-monitoring': 'Parent Dashboard Monitoring',
  'player-progress': 'Player Progress',
  leaderboard: 'Leaderboard',
  'priority-assignments': 'Priority Assignments',
  'assignment-spotlight': 'Assignment Spotlight',
};

const formatKangurWidgetLabel = (label: string): string =>
  label
    .split(' ')
    .map((word, index) => {
      if (word.toUpperCase() === 'XP') {
        return 'XP';
      }
      const normalized = word.toLowerCase();
      return index === 0
        ? normalized.charAt(0).toUpperCase() + normalized.slice(1)
        : normalized;
    })
    .join(' ');

export const KANGUR_WIDGET_LABELS = new Map<KangurWidgetId, string>(
  KANGUR_WIDGET_IDS.map((widgetId) => [
    widgetId,
    formatKangurWidgetLabel(KANGUR_WIDGET_LABELS_BY_ID[widgetId]),
  ])
);

/**
 * Options for the CMS block selector.
 */
export const KANGUR_WIDGET_OPTIONS: ReadonlyArray<LabeledOptionDto<KangurWidgetId>> = KANGUR_WIDGET_IDS
  .map((widgetId) => ({
    label: KANGUR_WIDGET_LABELS.get(widgetId) ?? formatKangurWidgetLabel(KANGUR_WIDGET_LABELS_BY_ID[widgetId]),
    value: widgetId,
  }));

/**
 * Helper to resolve a human-readable label for a widget ID.
 */
export const getKangurWidgetLabel = (widgetId: string | null | undefined): string => {
  if (!widgetId) return 'Kangur widget';
  return KANGUR_WIDGET_LABELS.get(widgetId as KangurWidgetId) ?? `Kangur: ${widgetId}`;
};
