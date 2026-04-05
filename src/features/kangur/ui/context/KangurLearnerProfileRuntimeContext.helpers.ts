'use client';

import { useEffect, useState } from 'react';

import {
  appendKangurUrlParams,
  getKangurPageHref as createPageUrl,
} from '@/features/kangur/config/routing';
import { logKangurClientError, withKangurClientError } from '@/features/kangur/observability/client';
import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import type { KangurScoreRecord, KangurUser } from '@kangur/platform';
import { isKangurAuthStatusError } from '@/features/kangur/services/status-errors';
import {
  LEARNER_PROFILE_SCORE_FETCH_LIMIT,
  loadLearnerProfileScores,
} from '@/features/kangur/ui/services/learner-profile-scores';
import type { KangurLessonSubject } from '@/features/kangur/shared/contracts/kangur';
import type { KangurDifficulty, KangurOperation } from '@/features/kangur/ui/types';
import type {
  KangurAssignmentPriority,
  KangurRouteAction,
} from '@/features/kangur/shared/contracts/kangur';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

const kangurPlatform = getKangurPlatform();

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
  'rose' | 'amber' | 'emerald'
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

export const resolveLearnerProfileScoreIdentity = (
  user: KangurUser | null
): KangurLearnerProfileScoreIdentity => ({
  learnerId: trimKangurText(user?.activeLearner?.id),
  userName: trimKangurText(user?.full_name),
  userEmail: trimKangurText(user?.email),
});

export const hasLearnerProfileScoreIdentity = ({
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

export const useLearnerProfileScores = ({
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
