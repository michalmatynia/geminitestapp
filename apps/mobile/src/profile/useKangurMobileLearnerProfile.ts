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
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
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
  fallbackLabel: string,
): string => {
  const activeLearner = learnerDisplayName?.trim();
  if (activeLearner) {
    return activeLearner;
  }

  const userName = fullName?.trim();
  return userName || fallbackLabel;
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
    const { copy, locale } = useKangurMobileI18n();
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
          locale,
        }),
      [defaultDailyGoalGames, locale, progress, scoresQuery.scores],
    );
    const masteryInsights = useMemo(
      () => buildLessonMasteryInsights(progress, 3, locale),
      [locale, progress],
    );
    const assignments = useMemo(() => buildKangurAssignments(progress, 3, locale), [locale, progress]);

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
        copy({
          de: 'Lokaler Modus',
          en: 'Local mode',
          pl: 'Tryb lokalny',
        }),
      ),
      getActionHref: createKangurMobileActionHref,
      isAuthenticated,
      isLoadingAuth,
      isLoadingScores: isLoadingAuth || scoresQuery.isLoading,
      masteryInsights,
      recommendationsNote: copy({
        de: 'Auf Mobile laufen bereits Lektionen, Arithmetiktraining und das erste Logikquiz. Ausgebautere grafische Modi bleiben vorerst informativ.',
        en: 'Lessons, arithmetic practice, and the first logic quiz already work on mobile. More advanced graphical modes are still informational for now.',
        pl: 'Na mobile działają już lekcje, trening arytmetyczny oraz pierwszy quiz logiczny. Bardziej rozbudowane tryby graficzne pozostają jeszcze informacyjne.',
      }),
      refreshScores: scoresQuery.refresh,
      scoresError:
        scoresQuery.error instanceof Error
          ? copy({
              de: 'Der Ergebnisverlauf konnte nicht geladen werden.',
              en: 'Could not load the score history.',
              pl: 'Nie udało się pobrać historii wyników.',
            })
          : null,
      signIn,
      supportsLearnerCredentials,
      snapshot,
    };
  };
