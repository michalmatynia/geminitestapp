'use client';

import { useLocale, useMessages, useTranslations } from 'next-intl';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type JSX,
  type ReactNode,
} from 'react';

import {
  KANGUR_LEARNER_PROFILE_DAILY_GOAL_GAMES,
  KANGUR_PROFILE_RECOMMENDATION_ACCENTS,
  hasScopedMessage,
  getKangurLearnerProfileDisplayNameWithFallback,
  formatKangurProfileDateTime,
  formatKangurProfileDuration,
  buildKangurOperationPracticeHref,
  buildKangurRecommendationHref,
  resolveLearnerProfileScoreIdentity,
  hasLearnerProfileScoreIdentity,
} from './KangurLearnerProfileRuntimeContext.utils';
import { useLearnerProfileScores } from './KangurLearnerProfileRuntimeContext.hooks';

const kangurPlatform = getKangurPlatform();
import type { KangurScoreRecord, KangurUser } from '@kangur/platform';
import { useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { useKangurSubjectFocus } from '@/features/kangur/ui/context/KangurSubjectFocusContext';
import { useKangurProgressState } from '@/features/kangur/ui/hooks/useKangurProgressState';
import {
  LEARNER_PROFILE_SCORE_FETCH_LIMIT,
  peekCachedScopedKangurScores,
} from '@/features/kangur/ui/services/learner-profile-scores';
import {
  buildKangurLearnerProfileSnapshot,
  translateKangurLearnerProfileWithFallback,
} from '@/features/kangur/ui/services/profile';
import type { KangurLearnerProfileSnapshot } from '@/features/kangur/shared/contracts/kangur-profile';
import type {
  KangurProgressState,
} from '@/features/kangur/shared/contracts/kangur';
import type { KangurAuthMode } from '@/features/kangur/shared/contracts/kangur-auth';
import { internalError } from '@/shared/errors/app-error';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

export {
  KANGUR_LEARNER_PROFILE_DAILY_GOAL_GAMES,
  KANGUR_PROFILE_RECOMMENDATION_ACCENTS,
  formatKangurProfileDateTime,
  formatKangurProfileDuration,
  buildKangurOperationPracticeHref,
  buildKangurRecommendationHref,
};

export const getKangurLearnerProfileDisplayName = (
  user: KangurUser | null,
  localModeLabel = 'Tryb lokalny'
): string => getKangurLearnerProfileDisplayNameWithFallback(user, localModeLabel);

type KangurLearnerProfileRuntimeContextValue = {
  basePath: string;
  user: KangurUser | null;
  progress: KangurProgressState;
  scores: KangurScoreRecord[];
  isLoadingScores: boolean;
  scoresError: string | null;
  snapshot: KangurLearnerProfileSnapshot;
  maxWeeklyGames: number;
  xpToNextLevel: number;
  navigateToLogin: (options?: { authMode?: KangurAuthMode }) => void;
};

type KangurLearnerProfileRuntimeStateContextValue = Pick<
  KangurLearnerProfileRuntimeContextValue,
  | 'basePath'
  | 'user'
  | 'progress'
  | 'scores'
  | 'isLoadingScores'
  | 'scoresError'
  | 'snapshot'
  | 'maxWeeklyGames'
  | 'xpToNextLevel'
>;

type KangurLearnerProfileRuntimeActionsContextValue = Pick<
  KangurLearnerProfileRuntimeContextValue,
  'navigateToLogin'
>;

const KangurLearnerProfileRuntimeStateContext =
  createContext<KangurLearnerProfileRuntimeStateContextValue | null>(null);
const KangurLearnerProfileRuntimeActionsContext =
  createContext<KangurLearnerProfileRuntimeActionsContextValue | null>(null);

export function KangurLearnerProfileRuntimeProvider({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const locale = normalizeSiteLocale(useLocale());
  const messages = useMessages() as Record<string, unknown>;
  const runtimeTranslations = useTranslations('KangurLearnerProfileRuntime');
  const progressRuntimeTranslations = useTranslations('KangurProgressRuntime');
  const { basePath } = useKangurRouting();
  const { user, navigateToLogin } = useKangurAuth();
  const { subject } = useKangurSubjectFocus();
  const progress = useKangurProgressState();
  const hasUser = Boolean(user);
  const scoreIdentity = useMemo(() => resolveLearnerProfileScoreIdentity(user), [user]);
  const hasScoreIdentity = hasLearnerProfileScoreIdentity(scoreIdentity);
  const cachedScores = useMemo(() => {
    if (!hasScoreIdentity) {
      return null;
    }

    return peekCachedScopedKangurScores(kangurPlatform.score, {
      learnerId: scoreIdentity.learnerId,
      playerName: scoreIdentity.userName,
      createdBy: scoreIdentity.userEmail,
      subject,
      limit: LEARNER_PROFILE_SCORE_FETCH_LIMIT,
    });
  }, [hasScoreIdentity, scoreIdentity.learnerId, scoreIdentity.userEmail, scoreIdentity.userName, subject]);
  const translateRuntime = useCallback(
    (key: string, values?: Record<string, string | number>) => {
      if (hasScopedMessage(messages, 'KangurLearnerProfileRuntime', key)) {
        return runtimeTranslations(key as never, values as never);
      }

      if (hasScopedMessage(messages, 'KangurProgressRuntime', key)) {
        return progressRuntimeTranslations(key as never, values as never);
      }

      return key;
    },
    [messages, progressRuntimeTranslations, runtimeTranslations]
  );
  const loadScoresErrorLabel = translateKangurLearnerProfileWithFallback(
    translateRuntime,
    'errors.loadScores',
    'Nie udało się pobrać historii wyników.'
  );
  const { scores, isLoadingScores, scoresError } = useLearnerProfileScores({
    cachedScores,
    hasUser,
    loadScoresErrorLabel,
    scoreIdentity,
    subject,
  });

  const snapshot = useMemo(
    () =>
      buildKangurLearnerProfileSnapshot({
        progress,
        scores,
        dailyGoalGames: KANGUR_LEARNER_PROFILE_DAILY_GOAL_GAMES,
        locale,
        translate: translateRuntime,
      }),
    [locale, progress, scores, translateRuntime]
  );
  const maxWeeklyGames = useMemo(
    () => Math.max(1, ...snapshot.weeklyActivity.map((point) => point.games)),
    [snapshot.weeklyActivity]
  );
  const xpToNextLevel = snapshot.nextLevel
    ? Math.max(0, snapshot.nextLevel.minXp - snapshot.totalXp)
    : 0;

  const stateValue = useMemo<KangurLearnerProfileRuntimeStateContextValue>(
    () => ({
      basePath,
      user,
      progress,
      scores,
      isLoadingScores,
      scoresError,
      snapshot,
      maxWeeklyGames,
      xpToNextLevel,
    }),
    [
      basePath,
      isLoadingScores,
      maxWeeklyGames,
      progress,
      scores,
      scoresError,
      snapshot,
      user,
      xpToNextLevel,
    ]
  );
  const actionsValue = useMemo<KangurLearnerProfileRuntimeActionsContextValue>(
    () => ({
      navigateToLogin,
    }),
    [navigateToLogin]
  );

  return (
    <KangurLearnerProfileRuntimeActionsContext.Provider value={actionsValue}>
      <KangurLearnerProfileRuntimeStateContext.Provider value={stateValue}>
        {children}
      </KangurLearnerProfileRuntimeStateContext.Provider>
    </KangurLearnerProfileRuntimeActionsContext.Provider>
  );
}

export function KangurLearnerProfileRuntimeBoundary({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}): JSX.Element {
  const existingStateContext = useContext(KangurLearnerProfileRuntimeStateContext);
  const existingActionsContext = useContext(KangurLearnerProfileRuntimeActionsContext);
  if (!enabled || existingStateContext || existingActionsContext) {
    return <>{children}</>;
  }

  return <KangurLearnerProfileRuntimeProvider>{children}</KangurLearnerProfileRuntimeProvider>;
}

export const useKangurLearnerProfileRuntimeState =
  (): KangurLearnerProfileRuntimeStateContextValue => {
    const context = useContext(KangurLearnerProfileRuntimeStateContext);
    if (!context) {
      throw internalError(
        'useKangurLearnerProfileRuntimeState must be used within a KangurLearnerProfileRuntimeProvider'
      );
    }
    return context;
  };

export const useKangurLearnerProfileRuntimeActions =
  (): KangurLearnerProfileRuntimeActionsContextValue => {
    const context = useContext(KangurLearnerProfileRuntimeActionsContext);
    if (!context) {
      throw internalError(
        'useKangurLearnerProfileRuntimeActions must be used within a KangurLearnerProfileRuntimeProvider'
      );
    }
    return context;
  };

export const useKangurLearnerProfileRuntime = (): KangurLearnerProfileRuntimeContextValue => {
  const state = useContext(KangurLearnerProfileRuntimeStateContext);
  const actions = useContext(KangurLearnerProfileRuntimeActionsContext);
  if (!state || !actions) {
    throw internalError(
      'useKangurLearnerProfileRuntime must be used within a KangurLearnerProfileRuntimeProvider'
    );
  }
  return useMemo(() => ({ ...state, ...actions }), [actions, state]);
};

export const useOptionalKangurLearnerProfileRuntime = ():
  | KangurLearnerProfileRuntimeContextValue
  | null => {
  const state = useContext(KangurLearnerProfileRuntimeStateContext);
  const actions = useContext(KangurLearnerProfileRuntimeActionsContext);
  return useMemo(() => {
    if (!state || !actions) {
      return null;
    }
    return { ...state, ...actions };
  }, [actions, state]);
};
