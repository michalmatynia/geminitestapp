import { z } from 'zod';

import {
  cmsPageComponentInputSchema,
  type PageComponentInput,
} from '@/shared/contracts/cms';
export {
  KANGUR_HIDDEN_WIDGET_IDS,
  KANGUR_LEGACY_WIDGET_IDS,
  KANGUR_WIDGET_IDS,
  KANGUR_WIDGET_LABELS,
  KANGUR_WIDGET_OPTIONS,
  getKangurWidgetLabel,
} from '@/shared/contracts/kangur-cms';
export type { KangurWidgetId } from '@/shared/contracts/kangur-cms';

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
