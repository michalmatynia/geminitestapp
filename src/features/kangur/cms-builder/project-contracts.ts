import { z } from 'zod';

import {
  cmsPageComponentInputSchema,
  type PageComponentInput,
} from '@/shared/contracts/cms';
import type { LabeledOptionDto } from '@/shared/contracts/base';

export const KANGUR_CMS_PROJECT_SETTING_KEY = 'kangur_cms_project_v1';

export const KANGUR_CMS_SCREEN_KEYS = [
  'Game',
  'Lessons',
  'LearnerProfile',
  'ParentDashboard',
] as const;

export type KangurCmsScreenKey = (typeof KANGUR_CMS_SCREEN_KEYS)[number];

export const KANGUR_CMS_SCREEN_LABELS: Record<KangurCmsScreenKey, string> = {
  Game: 'Game',
  Lessons: 'Lessons',
  LearnerProfile: 'Learner Profile',
  ParentDashboard: 'Parent Dashboard',
};

export const KANGUR_WIDGET_IDS = [
  'game-screen',
  'game-navigation',
  'game-xp-toast',
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

export const KANGUR_WIDGET_OPTIONS: ReadonlyArray<LabeledOptionDto<KangurWidgetId>> = [
  { label: 'Game Screen', value: 'game-screen' },
  { label: 'Game Navigation', value: 'game-navigation' },
  { label: 'Game XP Toast', value: 'game-xp-toast' },
  { label: 'Game Home Actions', value: 'game-home-actions' },
  { label: 'Game Training Setup', value: 'game-training-setup' },
  { label: 'Game Kangur Setup', value: 'game-kangur-setup' },
  { label: 'Game Kangur Session', value: 'game-kangur-session' },
  { label: 'Game Calendar Training', value: 'game-calendar-training' },
  { label: 'Game Geometry Training', value: 'game-geometry-training' },
  { label: 'Game Operation Selector', value: 'game-operation-selector' },
  { label: 'Game Question Session', value: 'game-question-session' },
  { label: 'Game Result Summary', value: 'game-result-summary' },
  { label: 'Lessons Screen', value: 'lessons-screen' },
  { label: 'Learner Profile Screen', value: 'learner-profile-screen' },
  { label: 'Parent Dashboard Screen', value: 'parent-dashboard-screen' },
  { label: 'Lesson Catalog', value: 'lesson-catalog' },
  { label: 'Active Lesson Panel', value: 'active-lesson-panel' },
  { label: 'Lesson Navigation', value: 'lesson-navigation' },
  { label: 'Learner Profile Hero', value: 'learner-profile-hero' },
  { label: 'Learner Profile Level Progress', value: 'learner-profile-level-progress' },
  { label: 'Learner Profile Overview', value: 'learner-profile-overview' },
  { label: 'Learner Profile Recommendations', value: 'learner-profile-recommendations' },
  { label: 'Learner Profile Assignments', value: 'learner-profile-assignments' },
  { label: 'Learner Profile Mastery', value: 'learner-profile-mastery' },
  { label: 'Learner Profile Performance', value: 'learner-profile-performance' },
  { label: 'Learner Profile Sessions', value: 'learner-profile-sessions' },
  { label: 'Parent Dashboard Hero', value: 'parent-dashboard-hero' },
  {
    label: 'Parent Dashboard Learner Management',
    value: 'parent-dashboard-learner-management',
  },
  { label: 'Parent Dashboard Tabs', value: 'parent-dashboard-tabs' },
  { label: 'Parent Dashboard Progress', value: 'parent-dashboard-progress' },
  { label: 'Parent Dashboard Scores', value: 'parent-dashboard-scores' },
  { label: 'Parent Dashboard Assignments', value: 'parent-dashboard-assignments' },
  { label: 'Parent Dashboard Monitoring', value: 'parent-dashboard-monitoring' },
  { label: 'Player Progress', value: 'player-progress' },
  { label: 'Leaderboard', value: 'leaderboard' },
  { label: 'Priority Assignments', value: 'priority-assignments' },
  { label: 'Assignment Spotlight', value: 'assignment-spotlight' },
] as const;

export const KANGUR_WIDGET_LABELS = new Map<KangurWidgetId, string>(
  KANGUR_WIDGET_OPTIONS.map((option) => [option.value, option.label])
);

export const getKangurWidgetLabel = (widgetId: string | null | undefined): string => {
  if (!widgetId) {
    return 'Kangur widget';
  }

  const label = KANGUR_WIDGET_LABELS.get(widgetId as KangurWidgetId);
  return label ?? 'Kangur widget';
};

export type KangurCmsScreen = {
  key: KangurCmsScreenKey;
  name: string;
  components: PageComponentInput[];
};

export type KangurCmsProject = {
  version: 1;
  screens: Record<KangurCmsScreenKey, KangurCmsScreen>;
};

export const kangurCmsScreenKeySchema = z.enum(KANGUR_CMS_SCREEN_KEYS);
export const kangurCmsScreenSchema = z.object({
  key: kangurCmsScreenKeySchema,
  name: z.string().trim().min(1).max(120),
  components: z.array(cmsPageComponentInputSchema).max(128),
});

export const kangurCmsProjectSchema = z.object({
  version: z.literal(1).default(1),
  screens: z.object({
    Game: kangurCmsScreenSchema,
    Lessons: kangurCmsScreenSchema,
    LearnerProfile: kangurCmsScreenSchema,
    ParentDashboard: kangurCmsScreenSchema,
  }),
});
