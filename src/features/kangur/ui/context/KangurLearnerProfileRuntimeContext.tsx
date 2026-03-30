'use client';

import { useLocale, useMessages, useTranslations } from 'next-intl';
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

const kangurPlatform = getKangurPlatform();
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
  peekCachedScopedKangurScores,
} from '@/features/kangur/ui/services/learner-profile-scores';
import {
  buildKangurLearnerProfileSnapshot,
  translateKangurLearnerProfileWithFallback,
} from '@/features/kangur/ui/services/profile';
import type { KangurLessonSubject } from '@/features/kangur/shared/contracts/kangur';
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
const LEARNER_PROFILE_SCORES_LOAD_DEFER_MS = 0;

const getScopedMessageValue = (
  messages: Record<string, unknown> | undefined,
  namespace: string,
  key: string
): unknown => {
  const scopedPath = [...namespace.split('.'), ...key.split('.')];
  return scopedPath.reduce<unknown>((current, segment) => {
    if (!current || typeof current !== 'object' || !(segment in current)) {
      return undefined;
    }
    return (current as Record<string, unknown>)[segment];
  }, messages);
};

export const hasScopedMessage = (
  messages: Record<string, unknown> | undefined,
  namespace: string,
  key: string
): boolean => getScopedMessageValue(messages, namespace, key) !== undefined;

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

type KangurLearnerProfileScoreIdentity = {
  learnerId: string;
  userName: string;
  userEmail: string;
};

type KangurLearnerProfileScoreState = {
  scores: KangurScoreRecord[];
  isLoadingScores: boolean;
  scoresError: string | null;
};

const trimKangurText = (value: string | null | undefined): string => value?.trim() ?? '';

const resolveLearnerProfileScoreIdentity = (
  user: KangurUser | null
): KangurLearnerProfileScoreIdentity => ({
  learnerId: trimKangurText(user?.activeLearner?.id),
  userName: trimKangurText(user?.full_name),
  userEmail: trimKangurText(user?.email),
});

const hasLearnerProfileScoreIdentity = ({
  learnerId,
  userEmail,
  userName,
}: KangurLearnerProfileScoreIdentity): boolean =>
  learnerId.length > 0 || userName.length > 0 || userEmail.length > 0;

const resolveLearnerProfileScoreLoadMode = ({
  cachedScores,
  scoreIdentity,
}: {
  cachedScores: KangurScoreRecord[] | null;
  scoreIdentity: KangurLearnerProfileScoreIdentity;
}): 'empty' | 'cached' | 'load' => {
  if (!hasLearnerProfileScoreIdentity(scoreIdentity)) {
    return 'empty';
  }
  return cachedScores === null ? 'load' : 'cached';
};

const applyLearnerProfileScoreState = (
  setState: React.Dispatch<React.SetStateAction<KangurLearnerProfileScoreState>>,
  nextState: Partial<KangurLearnerProfileScoreState>
): void => {
  setState((current) => ({
    ...current,
    ...nextState,
  }));
};

const loadDeferredLearnerProfileScores = async ({
  hasUser,
  isActive,
  loadScoresErrorLabel,
  scoreIdentity,
  setState,
  subject,
}: {
  hasUser: boolean;
  isActive: () => boolean;
  loadScoresErrorLabel: string;
  scoreIdentity: KangurLearnerProfileScoreIdentity;
  setState: React.Dispatch<React.SetStateAction<KangurLearnerProfileScoreState>>;
  subject: string;
}): Promise<void> => {
  const { learnerId, userEmail, userName } = scoreIdentity;
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
          subject: subject as KangurLessonSubject,
          limit: LEARNER_PROFILE_SCORE_FETCH_LIMIT,
        }),
      {
        fallback: [],
        onError: (error) => {
          if (!isActive()) {
            return;
          }

          if (isKangurAuthStatusError(error)) {
            applyLearnerProfileScoreState(setState, {
              scores: [],
              scoresError: null,
            });
            return;
          }

          applyLearnerProfileScoreState(setState, {
            scoresError: loadScoresErrorLabel,
          });
          logKangurClientError(error, {
            source: 'kangur.learner-profile',
            action: 'load-scores',
            hasUser,
            subject,
          });
        },
        shouldReport: () => false,
      }
    );
    if (!isActive()) {
      return;
    }
    applyLearnerProfileScoreState(setState, {
      scores: loadedScores,
    });
  } finally {
    if (isActive()) {
      applyLearnerProfileScoreState(setState, {
        isLoadingScores: false,
      });
    }
  }
};

const useLearnerProfileScores = ({
  cachedScores,
  hasUser,
  loadScoresErrorLabel,
  scoreIdentity,
  subject,
}: {
  cachedScores: KangurScoreRecord[] | null;
  hasUser: boolean;
  loadScoresErrorLabel: string;
  scoreIdentity: KangurLearnerProfileScoreIdentity;
  subject: string;
}): KangurLearnerProfileScoreState => {
  const hasScoreIdentity = hasLearnerProfileScoreIdentity(scoreIdentity);
  const [scoreState, setScoreState] = useState<KangurLearnerProfileScoreState>(() => ({
    scores: cachedScores ?? [],
    isLoadingScores: hasScoreIdentity && cachedScores === null,
    scoresError: null,
  }));

  useEffect(() => {
    let isActive = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const stop = (): void => {
      isActive = false;
      if (timeoutId !== null) {
        globalThis.clearTimeout(timeoutId);
      }
    };
    const mode = resolveLearnerProfileScoreLoadMode({
      cachedScores,
      scoreIdentity,
    });

    if (mode === 'empty') {
      applyLearnerProfileScoreState(setScoreState, {
        scores: [],
        isLoadingScores: false,
        scoresError: null,
      });
      return stop;
    }

    if (mode === 'cached') {
      applyLearnerProfileScoreState(setScoreState, {
        scores: cachedScores ?? [],
        isLoadingScores: false,
        scoresError: null,
      });
      return stop;
    }

    applyLearnerProfileScoreState(setScoreState, {
      isLoadingScores: true,
      scoresError: null,
    });
    timeoutId = globalThis.setTimeout(() => {
      void loadDeferredLearnerProfileScores({
        hasUser,
        isActive: () => isActive,
        loadScoresErrorLabel,
        scoreIdentity,
        setState: setScoreState,
        subject,
      });
    }, LEARNER_PROFILE_SCORES_LOAD_DEFER_MS);

    return stop;
  }, [cachedScores, hasUser, loadScoresErrorLabel, scoreIdentity, subject]);

  return scoreState;
};

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
