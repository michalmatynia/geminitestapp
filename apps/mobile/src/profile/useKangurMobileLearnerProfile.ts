import {
  buildKangurAssignments,
  buildKangurLearnerProfileSnapshot,
  buildLessonMasteryInsights,
  resolvePreferredKangurPracticeOperation,
  type KangurAssignmentPlan,
  type KangurLearnerRecommendationAction,
  type KangurLearnerProfileSnapshot,
  type KangurLessonMasteryInsights,
} from '@kangur/core';
import { createDefaultKangurProgressState } from '@kangur/contracts';
import type { Href } from 'expo-router';
import { useMemo, useSyncExternalStore } from 'react';

import { useKangurMobileAuth } from '../auth/KangurMobileAuthContext';
import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';
import { useKangurMobileScoreHistory } from '../scores/useKangurMobileScoreHistory';

type UseKangurMobileLearnerProfileResult = {
  assignments: KangurAssignmentPlan[];
  authError: string | null;
  authMode: 'development' | 'learner-session';
  canNavigateToRecommendation: (page: string) => boolean;
  displayName: string;
  getActionHref: (action: KangurLearnerRecommendationAction) => Href | null;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  isLoadingScores: boolean;
  masteryInsights: KangurLessonMasteryInsights;
  recommendationsNote: string;
  refreshScores: () => Promise<void>;
  scoresError: string | null;
  signIn: () => Promise<void>;
  supportsLearnerCredentials: boolean;
  snapshot: KangurLearnerProfileSnapshot;
};

const getKangurMobileProfileDisplayName = (
  fullName: string | null | undefined,
  learnerDisplayName: string | null | undefined,
): string => {
  const activeLearner = learnerDisplayName?.trim();
  if (activeLearner) {
    return activeLearner;
  }

  const userName = fullName?.trim();
  return userName || 'Tryb lokalny';
};

const createKangurMobileActionHref = (
  action: KangurLearnerRecommendationAction,
): Href | null => {
  if (action.page === 'Lessons') {
    const focus = action.query?.['focus']?.trim();
    return focus
      ? {
          pathname: '/lessons',
          params: {
            focus,
          },
        }
      : '/lessons';
  }

  if (action.page === 'Game') {
    const resolvedOperation =
      resolvePreferredKangurPracticeOperation(action.query?.['operation']) ??
      resolvePreferredKangurPracticeOperation(action.query?.['focus']) ??
      'mixed';

    return {
      pathname: '/practice',
      params: {
        operation: resolvedOperation,
      },
    };
  }

  if (action.page === 'LearnerProfile' || action.page === 'ParentDashboard') {
    return '/profile';
  }

  return null;
};

export const useKangurMobileLearnerProfile =
  (): UseKangurMobileLearnerProfileResult => {
    const {
      authError,
      authMode,
      isLoadingAuth,
      session,
      signIn,
      supportsLearnerCredentials,
    } = useKangurMobileAuth();
    const { defaultDailyGoalGames, progressStore } = useKangurMobileRuntime();
    const progress = useSyncExternalStore(
      progressStore.subscribeToProgress,
      progressStore.loadProgress,
      createDefaultKangurProgressState,
    );
    const isAuthenticated = session.status === 'authenticated';
    const scoresQuery = useKangurMobileScoreHistory({
      enabled: isAuthenticated,
      limit: 120,
      sort: '-created_date',
    });

    const snapshot = useMemo(
      () =>
        buildKangurLearnerProfileSnapshot({
          progress,
          scores: scoresQuery.scores,
          dailyGoalGames: defaultDailyGoalGames,
        }),
      [defaultDailyGoalGames, progress, scoresQuery.scores],
    );
    const masteryInsights = useMemo(() => buildLessonMasteryInsights(progress), [progress]);
    const assignments = useMemo(() => buildKangurAssignments(progress), [progress]);

    return {
      assignments,
      authError,
      authMode,
      canNavigateToRecommendation: (page) =>
        page === 'Lessons' ||
        page === 'Game' ||
        page === 'LearnerProfile' ||
        page === 'ParentDashboard',
      displayName: getKangurMobileProfileDisplayName(
        session.user?.full_name,
        session.user?.activeLearner?.displayName,
      ),
      getActionHref: createKangurMobileActionHref,
      isAuthenticated,
      isLoadingAuth,
      isLoadingScores: isLoadingAuth || scoresQuery.isLoading,
      masteryInsights,
      recommendationsNote:
        'Lessons, arithmetic practice, and the first logic quiz routes are now live on mobile. Canvas-heavy game modes still remain informational.',
      refreshScores: scoresQuery.refresh,
      scoresError:
        scoresQuery.error instanceof Error
          ? 'Nie udalo sie pobrac historii wynikow.'
          : null,
      signIn,
      supportsLearnerCredentials,
      snapshot,
    };
  };
