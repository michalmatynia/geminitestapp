import type {
  KangurLearnerRecommendation,
  KangurOperationPerformance,
} from '@/features/kangur/shared/contracts/kangur-profile';
import type {
  KangurProgressState,
  KangurRouteAction,
} from '@/features/kangur/shared/contracts/kangur';
import {
  getKangurLearnerProfileFallbackCopy,
  type KangurLearnerProfileFallbackCopy,
} from '@/features/kangur/ui/services/profile.copy';
import { QUICK_START_OPERATIONS } from '@/features/kangur/ui/services/profile.constants';
import type { KangurLearnerProfileTranslate } from './profile-types';
import {
  resolvePracticeDifficulty,
  translateKangurLearnerProfileWithFallback,
} from './profile-utils';

export const localizeRecommendedSessionMomentum = (
  completedSessions: number,
  nextBadgeName: string | null,
  summary: string,
  translate?: KangurLearnerProfileTranslate
): {
  summary: string;
  nextBadgeName: string | null;
} => {
  if (!nextBadgeName) {
    return {
      nextBadgeName: null,
      summary: translateKangurLearnerProfileWithFallback(
        translate,
        'guidedMomentum.summary.complete',
        summary
      ),
    };
  }

  if (completedSessions < 1) {
    return {
      nextBadgeName: translateKangurLearnerProfileWithFallback(
        translate,
        'guidedMomentum.badges.guidedStep',
        nextBadgeName
      ),
      summary: translateKangurLearnerProfileWithFallback(
        translate,
        'guidedMomentum.summary.guidedStep',
        summary,
        {
          completed: Math.min(completedSessions, 1),
        }
      ),
    };
  }

  return {
    nextBadgeName: translateKangurLearnerProfileWithFallback(
      translate,
      'guidedMomentum.badges.guidedKeeper',
      nextBadgeName
    ),
    summary: translateKangurLearnerProfileWithFallback(
      translate,
      'guidedMomentum.summary.guidedKeeper',
      summary,
      {
        completed: Math.min(completedSessions, 3),
      }
    ),
  };
};

export const buildPracticeRecommendationAction = (
  operation: string | null,
  averageAccuracy: number,
  fallbackCopy: KangurLearnerProfileFallbackCopy,
  translate?: KangurLearnerProfileTranslate,
  actionLabelKey: 'playNow' | 'startTraining' = 'startTraining'
): KangurRouteAction => {
  const actionLabel = translateKangurLearnerProfileWithFallback(
    translate,
    `recommendations.actions.${actionLabelKey}`,
    fallbackCopy.actions[actionLabelKey]
  );

  if (!operation || !QUICK_START_OPERATIONS.has(operation)) {
    return {
      label: actionLabel,
      page: 'Game',
      query: {
        quickStart: 'training',
      },
    };
  }

  return {
    label: actionLabel,
    page: 'Game',
    query: {
      quickStart: 'operation',
      operation,
      difficulty: resolvePracticeDifficulty(averageAccuracy),
    },
  };
};

type BuildRecommendationsInput = {
  averageAccuracy: number;
  currentStreakDays: number;
  dailyGoalGames: number;
  todayGames: number;
  todayXpEarned: number;
  weeklyXpEarned: number;
  averageXpPerSession: number;
  operationPerformance: KangurOperationPerformance[];
  progress: KangurProgressState;
  locale: string;
  translate?: KangurLearnerProfileTranslate;
};

type RecommendationBuildContext = {
  input: BuildRecommendationsInput;
  fallbackCopy: KangurLearnerProfileFallbackCopy;
  remainingDailyGames: number;
  weakestOperation: KangurOperationPerformance | null;
  strongestOperation: KangurOperationPerformance | null;
};

const buildStreakPreservationRecommendation = ({
  fallbackCopy,
  input,
  strongestOperation,
}: RecommendationBuildContext): KangurLearnerRecommendation | null => {
  if (input.currentStreakDays <= 0 || input.todayGames !== 0) {
    return null;
  }

  return {
    id: 'streak_preservation',
    title: translateKangurLearnerProfileWithFallback(
      input.translate,
      'recommendations.streakPreservation.title',
      fallbackCopy.recommendations.streakPreservation.title
    ),
    description: translateKangurLearnerProfileWithFallback(
      input.translate,
      'recommendations.streakPreservation.description',
      fallbackCopy.recommendations.streakPreservation.description(input.currentStreakDays),
      {
        streak: input.currentStreakDays,
      }
    ),
    priority: 'high',
    action: buildPracticeRecommendationAction(
      strongestOperation?.operation ?? null,
      strongestOperation?.averageAccuracy ?? 80,
      fallbackCopy,
      input.translate
    ),
  };
};

const buildDailyGoalRecommendation = ({
  fallbackCopy,
  input,
  remainingDailyGames,
  weakestOperation,
}: RecommendationBuildContext): KangurLearnerRecommendation | null => {
  if (remainingDailyGames <= 0) {
    return null;
  }

  const isSingleRemaining = remainingDailyGames === 1;
  return {
    id: 'daily_goal',
    title: translateKangurLearnerProfileWithFallback(
      input.translate,
      'recommendations.dailyGoal.title',
      fallbackCopy.recommendations.dailyGoal.title
    ),
    description: translateKangurLearnerProfileWithFallback(
      input.translate,
      isSingleRemaining
        ? 'recommendations.dailyGoal.descriptionSingle'
        : 'recommendations.dailyGoal.descriptionMultiple',
      isSingleRemaining
        ? fallbackCopy.recommendations.dailyGoal.descriptionSingle(input.todayXpEarned)
        : fallbackCopy.recommendations.dailyGoal.descriptionMultiple(
            remainingDailyGames,
            input.todayXpEarned
          ),
      {
        remainingGames: remainingDailyGames,
        todayXpEarned: input.todayXpEarned,
      }
    ),
    priority: 'medium',
    action: buildPracticeRecommendationAction(
      weakestOperation?.operation ?? null,
      weakestOperation?.averageAccuracy ?? 50,
      fallbackCopy,
      input.translate,
      'playNow'
    ),
  };
};

const buildBoostXpMomentumDescription = ({
  fallbackCopy,
  input,
  strongestOperation,
}: RecommendationBuildContext): string =>
  strongestOperation
    ? translateKangurLearnerProfileWithFallback(
        input.translate,
        'recommendations.boostXpMomentum.descriptionWithOperation',
        fallbackCopy.recommendations.boostXpMomentum.descriptionWithOperation(
          input.todayXpEarned,
          strongestOperation.label,
          strongestOperation.averageXpPerSession
        ),
        {
          todayXpEarned: input.todayXpEarned,
          operation: strongestOperation.label,
          averageXpPerSession: strongestOperation.averageXpPerSession,
        }
      )
    : translateKangurLearnerProfileWithFallback(
        input.translate,
        'recommendations.boostXpMomentum.descriptionFallback',
        fallbackCopy.recommendations.boostXpMomentum.descriptionFallback(
          input.todayXpEarned,
          input.averageXpPerSession
        ),
        {
          todayXpEarned: input.todayXpEarned,
          xpMomentumTarget: input.averageXpPerSession,
        }
      );

const shouldBuildBoostXpMomentumRecommendation = (
  input: BuildRecommendationsInput,
  remainingDailyGames: number
): boolean =>
  remainingDailyGames === 0 &&
  input.todayXpEarned > 0 &&
  input.todayXpEarned < input.averageXpPerSession;

const resolveBoostXpMomentumActionOperation = (
  strongestOperation: KangurOperationPerformance | null,
  weakestOperation: KangurOperationPerformance | null
): string | null => strongestOperation?.operation ?? weakestOperation?.operation ?? null;

const resolveBoostXpMomentumActionAccuracy = (
  strongestOperation: KangurOperationPerformance | null,
  weakestOperation: KangurOperationPerformance | null
): number => strongestOperation?.averageAccuracy ?? weakestOperation?.averageAccuracy ?? 70;

const buildBoostXpMomentumRecommendation = (
  context: RecommendationBuildContext
): KangurLearnerRecommendation | null => {
  const { fallbackCopy, input, remainingDailyGames, strongestOperation, weakestOperation } = context;
  if (!shouldBuildBoostXpMomentumRecommendation(input, remainingDailyGames)) {
    return null;
  }

  return {
    id: 'boost_xp_momentum',
    title: translateKangurLearnerProfileWithFallback(
      input.translate,
      'recommendations.boostXpMomentum.title',
      fallbackCopy.recommendations.boostXpMomentum.title
    ),
    description: buildBoostXpMomentumDescription(context),
    priority: 'medium',
    action: buildPracticeRecommendationAction(
      resolveBoostXpMomentumActionOperation(strongestOperation, weakestOperation),
      resolveBoostXpMomentumActionAccuracy(strongestOperation, weakestOperation),
      fallbackCopy,
      input.translate
    ),
  };
};

const buildStreakBootstrapRecommendation = ({
  fallbackCopy,
  input,
  weakestOperation,
}: RecommendationBuildContext): KangurLearnerRecommendation | null => {
  if (input.currentStreakDays >= 2) {
    return null;
  }

  return {
    id: 'streak_bootstrap',
    title: translateKangurLearnerProfileWithFallback(
      input.translate,
      'recommendations.streakBootstrap.title',
      fallbackCopy.recommendations.streakBootstrap.title
    ),
    description: translateKangurLearnerProfileWithFallback(
      input.translate,
      'recommendations.streakBootstrap.description',
      fallbackCopy.recommendations.streakBootstrap.description
    ),
    priority: 'medium',
    action: buildPracticeRecommendationAction(
      weakestOperation?.operation ?? null,
      weakestOperation?.averageAccuracy ?? 50,
      fallbackCopy,
      input.translate
    ),
  };
};

export const buildRecommendations = (input: BuildRecommendationsInput): KangurLearnerRecommendation[] => {
  const fallbackCopy = getKangurLearnerProfileFallbackCopy(input.locale);
  const context: RecommendationBuildContext = {
    input,
    fallbackCopy,
    remainingDailyGames: Math.max(0, input.dailyGoalGames - input.todayGames),
    weakestOperation: input.operationPerformance.at(-1) ?? null,
    strongestOperation: input.operationPerformance[0] ?? null,
  };

  return [
    buildStreakPreservationRecommendation(context),
    buildDailyGoalRecommendation(context),
    buildBoostXpMomentumRecommendation(context),
    buildStreakBootstrapRecommendation(context),
  ].filter((entry): entry is KangurLearnerRecommendation => entry !== null);
};
