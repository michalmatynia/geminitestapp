import { resolvePreferredKangurPracticeOperation } from '@kangur/core';
import {
  buildKangurLearnerProfileSnapshot,
  type KangurLearnerRecommendationAction,
  type KangurLearnerProfileSnapshot,
} from '@kangur/core';
import { createDefaultKangurProgressState } from '@kangur/contracts/kangur';
import type { Href } from 'expo-router';
import { useMemo, useSyncExternalStore } from 'react';

import { useKangurMobileAuth } from '../auth/KangurMobileAuthContext';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { createKangurParentDashboardHref } from '../parent/parentHref';
import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';
import { useKangurMobileScoreHistory } from '../scores/useKangurMobileScoreHistory';

type UseKangurMobileLearnerProfileResult = {
  authError: string | null;
  authMode: 'development' | 'learner-session';
  canNavigateToRecommendation: (page: string) => boolean;
  displayName: string;
  getActionHref: (action: KangurLearnerRecommendationAction) => Href | null;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  isLoadingScores: boolean;
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

  if (action.page === 'LearnerProfile') {
    return '/profile';
  }

  if (action.page === 'ParentDashboard') {
    return createKangurParentDashboardHref();
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

    return {
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
      recommendationsNote: copy({
        de: 'Lektionen, Arithmetiktraining und das erste Logikquiz sind schon bereit. Ausgebautere grafische Modi erscheinen hier später.',
        en: 'Lessons, arithmetic practice, and the first logic quiz are already ready. More advanced graphical modes will appear here later.',
        pl: 'Lekcje, trening arytmetyczny i pierwszy quiz logiczny są już gotowe. Bardziej rozbudowane tryby graficzne pojawią się tu później.',
      }),
      refreshScores: scoresQuery.refresh,
      scoresError:
        scoresQuery.error instanceof Error
          ? copy({
              de: 'Die Ergebnisse konnten nicht geladen werden.',
              en: 'Could not load the results.',
              pl: 'Nie udało się pobrać wyników.',
            })
          : null,
      signIn,
      supportsLearnerCredentials,
      snapshot,
    };
  };
