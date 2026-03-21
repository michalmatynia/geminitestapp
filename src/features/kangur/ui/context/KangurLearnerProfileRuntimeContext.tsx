'use client';

import { useLocale, useTranslations } from 'next-intl';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type JSX,
  type ReactNode,
} from 'react';

import {
  appendKangurUrlParams,
  getKangurPageHref as createPageUrl,
} from '@/features/kangur/config/routing';
import { logKangurClientError, withKangurClientError } from '@/features/kangur/observability/client';
import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import type { KangurScoreRecord, KangurUser } from '@kangur/platform';
import { isKangurAuthStatusError } from '@/features/kangur/services/status-errors';
import { useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { useKangurSubjectFocus } from '@/features/kangur/ui/context/KangurSubjectFocusContext';
import type { KangurAccent } from '@/features/kangur/ui/design/tokens';
import { useKangurProgressState } from '@/features/kangur/ui/hooks/useKangurProgressState';
import {
  LEARNER_PROFILE_SCORE_FETCH_LIMIT,
  loadLearnerProfileScores,
} from '@/features/kangur/ui/services/learner-profile-scores';
import {
  buildKangurLearnerProfileSnapshot,
  translateKangurLearnerProfileWithFallback,
} from '@/features/kangur/ui/services/profile';
import type { KangurLearnerProfileSnapshot } from '@/features/kangur/shared/contracts/kangur-profile';
import type { KangurDifficulty, KangurOperation } from '@/features/kangur/ui/types';
import type {
  KangurAssignmentPriority,
  KangurProgressState,
  KangurRouteAction,
} from '@/features/kangur/shared/contracts/kangur';
import type { KangurAuthMode } from '@/features/kangur/shared/contracts/kangur-auth';
import { internalError } from '@/features/kangur/shared/errors/app-error';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';


export const KANGUR_LEARNER_PROFILE_DAILY_GOAL_GAMES = 3;

const QUICK_START_OPERATIONS = new Set<KangurOperation>([
  'addition',
  'subtraction',
  'multiplication',
  'division',
  'decimals',
  'powers',
  'roots',
  'clock',
  'mixed',
]);

export const KANGUR_PROFILE_RECOMMENDATION_ACCENTS: Record<
  KangurAssignmentPriority,
  KangurAccent
> = {
  high: 'rose',
  medium: 'amber',
  low: 'emerald',
};

const resolvePracticeDifficulty = (averageAccuracy: number): KangurDifficulty => {
  if (averageAccuracy >= 85) {
    return 'hard';
  }
  if (averageAccuracy >= 70) {
    return 'medium';
  }
  return 'easy';
};

export const getKangurLearnerProfileDisplayName = (
  user: KangurUser | null,
  localModeLabel = 'Tryb lokalny'
): string => getKangurLearnerProfileDisplayNameWithFallback(user, localModeLabel);

export const getKangurLearnerProfileDisplayNameWithFallback = (
  user: KangurUser | null,
  localModeLabel: string
): string => user?.activeLearner?.displayName?.trim() || user?.full_name?.trim() || localModeLabel;

export const formatKangurProfileDateTime = (
  value: string,
  options?: {
    locale?: string | null | undefined;
    dateMissingLabel?: string | undefined;
  }
): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return options?.dateMissingLabel ?? 'Brak daty';
  }
  return parsed.toLocaleString(normalizeSiteLocale(options?.locale), {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

export const formatKangurProfileDuration = (seconds: number): string => {
  const normalized = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(normalized / 60);
  const remainingSeconds = normalized % 60;
  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }
  return `${minutes}m ${`${remainingSeconds}`.padStart(2, '0')}s`;
};

export const buildKangurOperationPracticeHref = (
  basePath: string,
  operation: string,
  averageAccuracy: number
): string => {
  const params = new URLSearchParams({ quickStart: 'training' });

  if (QUICK_START_OPERATIONS.has(operation as KangurOperation)) {
    params.set('quickStart', 'operation');
    params.set('operation', operation);
    params.set('difficulty', resolvePracticeDifficulty(averageAccuracy));
  }

  return appendKangurUrlParams(
    createPageUrl('Game', basePath),
    Object.fromEntries(params),
    basePath
  );
};

export const buildKangurRecommendationHref = (
  basePath: string,
  action: KangurRouteAction
): string => {
  const baseHref = createPageUrl(action.page, basePath);
  return action.query ? appendKangurUrlParams(baseHref, action.query, basePath) : baseHref;
};

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
  const runtimeTranslations = useTranslations('KangurLearnerProfileRuntime');
  const progressRuntimeTranslations = useTranslations('KangurProgressRuntime');
  const { basePath } = useKangurRouting();
  const { user, navigateToLogin } = useKangurAuth();
  const { subject } = useKangurSubjectFocus();
  const progress = useKangurProgressState();
  const kangurPlatform = useMemo(() => getKangurPlatform(), []);
  const hasUser = Boolean(user);
  const [scores, setScores] = useState<KangurScoreRecord[]>([]);
  const [isLoadingScores, setIsLoadingScores] = useState(true);
  const [scoresError, setScoresError] = useState<string | null>(null);
  const translateRuntime = useCallback(
    (key: string, values?: Record<string, string | number>) => {
      const translated = runtimeTranslations(key as never, values as never);
      return translated === key
        ? progressRuntimeTranslations(key as never, values as never)
        : translated;
    },
    [progressRuntimeTranslations, runtimeTranslations]
  );
  const loadScoresErrorLabel = translateKangurLearnerProfileWithFallback(
    translateRuntime,
    'errors.loadScores',
    'Nie udało się pobrać historii wyników.'
  );

  useEffect(() => {
    let isActive = true;

    const loadScores = async (): Promise<void> => {
      const learnerId = user?.activeLearner?.id?.trim() ?? '';
      const userName = user?.full_name?.trim() ?? '';
      const userEmail = user?.email?.trim() ?? '';
      if (!learnerId && !userName && !userEmail) {
        if (isActive) {
          setScores([]);
          setIsLoadingScores(false);
          setScoresError(null);
        }
        return;
      }

      setIsLoadingScores(true);
      setScoresError(null);

      try {
        const loadedScores = await withKangurClientError(
          {
            source: 'kangur.learner-profile',
            action: 'load-scores',
            description: 'Loads learner score history for the profile view.',
            context: {
              hasUser,
              subject,
            },
          },
          async () =>
            await loadLearnerProfileScores(kangurPlatform.score, {
              learnerId,
              userName,
              userEmail,
              subject,
              limit: LEARNER_PROFILE_SCORE_FETCH_LIMIT,
            }),
          {
            fallback: [],
            onError: (error) => {
              if (!isActive) {
                return;
              }

              if (isKangurAuthStatusError(error)) {
                setScores([]);
                setScoresError(null);
              } else {
                setScoresError(loadScoresErrorLabel);
                logKangurClientError(error, {
                  source: 'kangur.learner-profile',
                  action: 'load-scores',
                  hasUser,
                  subject,
                });
              }
            },
            shouldReport: () => false,
          }
        );
        if (!isActive) {
          return;
        }
        setScores(loadedScores);
      } finally {
        if (isActive) {
          setIsLoadingScores(false);
        }
      }
    };

    void loadScores();

    return () => {
      isActive = false;
    };
  }, [
    hasUser,
    kangurPlatform,
    loadScoresErrorLabel,
    subject,
    user?.activeLearner?.id,
    user?.email,
    user?.full_name,
  ]);

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
