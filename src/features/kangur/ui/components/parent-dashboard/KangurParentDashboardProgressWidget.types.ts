import type { KangurLearnerProfileTranslate as ProgressTranslations } from '@/features/kangur/ui/services/profile/profile-types';
import type { useKangurParentDashboardRuntime } from '@/features/kangur/ui/context/KangurParentDashboardRuntimeContext';

export type ParentDashboardRuntimeState = ReturnType<typeof useKangurParentDashboardRuntime>;
export type ParentDashboardLesson = NonNullable<ParentDashboardRuntimeState['lessons']>[number];

export type ParentDashboardLessonPanelCard = {
  lesson: ParentDashboardLesson;
  percent: number;
  sections: {
    id: string;
    label: string;
    totalCount: number;
    viewedCount: number;
  }[];
  total: number;
  viewed: number;
};

export type ParentDashboardProgressSnapshot = ReturnType<typeof buildKangurLearnerProfileSnapshot>;
export type ParentDashboardLessonMasteryInsights = ReturnType<typeof buildLessonMasteryInsights>;
export type ParentDashboardDailyQuest = ReturnType<typeof getCurrentKangurDailyQuest>;
