'use client';

import {
  createContext,
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
import { logKangurClientError } from '@/features/kangur/observability/client';
import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import type { KangurScoreRecord, KangurUser } from '@/features/kangur/services/ports';
import { isKangurAuthStatusError } from '@/features/kangur/services/status-errors';
import { useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { useKangurProgressState } from '@/features/kangur/ui/hooks/useKangurProgressState';
import {
  LEARNER_PROFILE_SCORE_FETCH_LIMIT,
  loadLearnerProfileScores,
} from '@/features/kangur/ui/services/learner-profile-scores';
import {
  buildKangurLearnerProfileSnapshot,
  type KangurLearnerProfileSnapshot,
  type KangurLearnerRecommendationAction,
  type KangurLearnerRecommendationPriority,
} from '@/features/kangur/ui/services/profile';
import type { KangurAccent } from '@/features/kangur/ui/design/tokens';
import type {
  KangurDifficulty,
  KangurOperation,
  KangurProgressState,
} from '@/features/kangur/ui/types';

export const KANGUR_LEARNER_PROFILE_DAILY_GOAL_GAMES = 3;

const kangurPlatform = getKangurPlatform();

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
  KangurLearnerRecommendationPriority,
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

export const getKangurLearnerProfileDisplayName = (user: KangurUser | null): string =>
  user?.activeLearner?.displayName?.trim() || user?.full_name?.trim() || 'Tryb lokalny';

export const formatKangurProfileDateTime = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Brak daty';
  }
  return parsed.toLocaleString('pl-PL', {
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
  action: KangurLearnerRecommendationAction
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
  navigateToLogin: () => void;
};

const KangurLearnerProfileRuntimeContext =
  createContext<KangurLearnerProfileRuntimeContextValue | null>(null);

export function KangurLearnerProfileRuntimeProvider({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const { basePath } = useKangurRouting();
  const { user, navigateToLogin } = useKangurAuth();
  const progress = useKangurProgressState();
  const hasUser = Boolean(user);
  const [scores, setScores] = useState<KangurScoreRecord[]>([]);
  const [isLoadingScores, setIsLoadingScores] = useState(true);
  const [scoresError, setScoresError] = useState<string | null>(null);

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
        const loadedScores = await loadLearnerProfileScores(kangurPlatform.score, {
          learnerId,
          userName,
          userEmail,
          limit: LEARNER_PROFILE_SCORE_FETCH_LIMIT,
        });
        if (!isActive) {
          return;
        }
        setScores(loadedScores);
      } catch (error: unknown) {
        if (!isActive) {
          return;
        }

        if (isKangurAuthStatusError(error)) {
          setScores([]);
          setScoresError(null);
        } else {
          logKangurClientError(error, {
            source: 'KangurLearnerProfileRuntimeContext',
            action: 'loadScores',
            hasUser,
          });
          setScoresError('Nie udalo sie pobrac historii wynikow.');
        }
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
  }, [hasUser, user?.activeLearner?.id, user?.email, user?.full_name]);

  const snapshot = useMemo(
    () =>
      buildKangurLearnerProfileSnapshot({
        progress,
        scores,
        dailyGoalGames: KANGUR_LEARNER_PROFILE_DAILY_GOAL_GAMES,
      }),
    [progress, scores]
  );
  const maxWeeklyGames = useMemo(
    () => Math.max(1, ...snapshot.weeklyActivity.map((point) => point.games)),
    [snapshot.weeklyActivity]
  );
  const xpToNextLevel = snapshot.nextLevel
    ? Math.max(0, snapshot.nextLevel.minXp - snapshot.totalXp)
    : 0;

  const value = useMemo<KangurLearnerProfileRuntimeContextValue>(
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
      navigateToLogin,
    }),
    [
      basePath,
      isLoadingScores,
      maxWeeklyGames,
      navigateToLogin,
      progress,
      scores,
      scoresError,
      snapshot,
      user,
      xpToNextLevel,
    ]
  );

  return (
    <KangurLearnerProfileRuntimeContext.Provider value={value}>
      {children}
    </KangurLearnerProfileRuntimeContext.Provider>
  );
}

export function KangurLearnerProfileRuntimeBoundary({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}): JSX.Element {
  const existingContext = useContext(KangurLearnerProfileRuntimeContext);
  if (!enabled || existingContext) {
    return <>{children}</>;
  }

  return <KangurLearnerProfileRuntimeProvider>{children}</KangurLearnerProfileRuntimeProvider>;
}

export const useKangurLearnerProfileRuntime = (): KangurLearnerProfileRuntimeContextValue => {
  const context = useContext(KangurLearnerProfileRuntimeContext);
  if (!context) {
    throw new Error(
      'useKangurLearnerProfileRuntime must be used within a KangurLearnerProfileRuntimeProvider'
    );
  }
  return context;
};

export const useOptionalKangurLearnerProfileRuntime = ():
  | KangurLearnerProfileRuntimeContextValue
  | null => useContext(KangurLearnerProfileRuntimeContext);
