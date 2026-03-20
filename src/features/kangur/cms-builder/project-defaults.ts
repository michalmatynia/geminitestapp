// @ts-nocheck
import {
  KANGUR_CMS_SCREEN_LABELS,
  type KangurCmsProject,
} from './project-contracts';
import { createDefaultGameScreenComponents } from './defaults/game-defaults';
import { createDefaultLessonsScreenComponents } from './defaults/lesson-defaults';
import { createDefaultLearnerProfileScreenComponents } from './defaults/profile-defaults';
import { createDefaultParentDashboardScreenComponents } from './defaults/parent-defaults';
import { createDefaultAuthScreenComponents } from './defaults/auth-defaults';

export {
  createDefaultGameScreenComponents,
  createDefaultLessonsScreenComponents,
  createDefaultLearnerProfileScreenComponents,
  createDefaultParentDashboardScreenComponents,
  createDefaultAuthScreenComponents,
};

export function createDefaultKangurCmsProject(locale?: string | null): KangurCmsProject {
  return {
    version: 1,
    screens: {
      Game: {
        key: 'Game',
        name: KANGUR_CMS_SCREEN_LABELS.Game,
        components: createDefaultGameScreenComponents(locale),
      },
      Lessons: {
        key: 'Lessons',
        name: KANGUR_CMS_SCREEN_LABELS.Lessons,
        components: createDefaultLessonsScreenComponents(locale),
      },
      LearnerProfile: {
        key: 'LearnerProfile',
        name: KANGUR_CMS_SCREEN_LABELS.LearnerProfile,
        components: createDefaultLearnerProfileScreenComponents(),
      },
      ParentDashboard: {
        key: 'ParentDashboard',
        name: KANGUR_CMS_SCREEN_LABELS.ParentDashboard,
        components: createDefaultParentDashboardScreenComponents(),
      },
      Auth: {
        key: 'Auth',
        name: 'Auth',
        components: createDefaultAuthScreenComponents(),
      },
    },
  };
}
