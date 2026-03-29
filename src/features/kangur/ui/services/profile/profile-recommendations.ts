'use client';

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
  translate?: KangurLearnerProfileTranslate
): KangurRouteAction => {
  const startTrainingLabel = translateKangurLearnerProfileWithFallback(
    translate,
    'recommendations.actions.startTraining',
    fallbackCopy.actions.startTraining
  );

  if (!operation || !QUICK_START_OPERATIONS.has(operation)) {
    return {
      label: startTrainingLabel,
      page: 'Game',
      query: {
        quickStart: 'training',
      },
    };
  }

  return {
    label: startTrainingLabel,
    page: 'Game',
    query: {
      quickStart: 'operation',
      operation,
      difficulty: resolvePracticeDifficulty(averageAccuracy),
    },
  };
};

export const buildRecommendations = (input: {
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
}): KangurLearnerRecommendation[] => {
  const recommendations: KangurLearnerRecommendation[] = [];
  const fallbackCopy = getKangurLearnerProfileFallbackCopy(input.locale);
  const remainingDailyGames = Math.max(0, input.dailyGoalGames - input.todayGames);
  const weakestOperation = input.operationPerformance.at(-1) ?? null;
  const strongestOperation = input.operationPerformance[0] ?? null;

  // Streak preservation
  if (input.currentStreakDays > 0 && input.todayGames === 0) {
    recommendations.push({
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
    });
  }

  // Daily goal
  if (remainingDailyGames > 0) {
    const isSingleRemaining = remainingDailyGames === 1;
    recommendations.push({
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
        input.translate
      ),
    });
  }

  if (input.currentStreakDays < 2) {
    recommendations.push({
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
    });
  }

  return recommendations;
};
