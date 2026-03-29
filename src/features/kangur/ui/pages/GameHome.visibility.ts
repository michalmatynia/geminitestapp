import type { KangurUser } from '@kangur/platform';

import type { KangurProgressState } from '@/features/kangur/ui/types';

type GameHomeProgressLike =
  | Partial<
      Pick<
        KangurProgressState,
        'dailyQuestsCompleted' | 'gamesPlayed' | 'lessonsCompleted' | 'totalXp'
      >
    >
  | null
  | undefined;

export type KangurGameHomeVisibility = {
  canAccessParentAssignments: boolean;
  hasMeaningfulProgress: boolean;
  hideLearnerWidgetsForParent: boolean;
  showAssignments: boolean;
  showParentSpotlight: boolean;
  showProgressGrid: boolean;
  showQuest: boolean;
  showSummary: boolean;
};

const GAME_HOME_PROGRESS_KEYS = [
  'totalXp',
  'gamesPlayed',
  'lessonsCompleted',
  'dailyQuestsCompleted',
] as const satisfies readonly (keyof NonNullable<GameHomeProgressLike>)[];

export const hasMeaningfulGameHomeProgress = (progress: GameHomeProgressLike): boolean =>
  GAME_HOME_PROGRESS_KEYS.some((key) => (progress?.[key] ?? 0) > 0);

const resolveHideLearnerWidgetsForParent = (
  user: KangurUser | null | undefined
): boolean => user?.actorType === 'parent' && !user?.activeLearner?.id;

const resolveCanShowLearnerWidgets = (
  hideLearnerWidgetsForParent: boolean
): boolean => !hideLearnerWidgetsForParent;

const resolveShouldShowGameHomeSummary = ({
  hasMeaningfulProgress,
  hideLearnerWidgetsForParent,
}: {
  hasMeaningfulProgress: boolean;
  hideLearnerWidgetsForParent: boolean;
}): boolean =>
  resolveCanShowLearnerWidgets(hideLearnerWidgetsForParent) && hasMeaningfulProgress;

export const resolveKangurGameHomeVisibility = ({
  canAccessParentAssignments,
  progress,
  user,
}: {
  canAccessParentAssignments: boolean;
  progress: GameHomeProgressLike;
  user: KangurUser | null | undefined;
}): KangurGameHomeVisibility => {
  const hideLearnerWidgetsForParent = resolveHideLearnerWidgetsForParent(user);
  const hasMeaningfulProgress = hasMeaningfulGameHomeProgress(progress);
  const canShowLearnerWidgets = resolveCanShowLearnerWidgets(hideLearnerWidgetsForParent);

  return {
    canAccessParentAssignments,
    hasMeaningfulProgress,
    hideLearnerWidgetsForParent,
    showAssignments: canAccessParentAssignments,
    showParentSpotlight: canAccessParentAssignments,
    showProgressGrid: canShowLearnerWidgets,
    showQuest: canShowLearnerWidgets,
    showSummary: resolveShouldShowGameHomeSummary({
      hasMeaningfulProgress,
      hideLearnerWidgetsForParent,
    }),
  };
};
