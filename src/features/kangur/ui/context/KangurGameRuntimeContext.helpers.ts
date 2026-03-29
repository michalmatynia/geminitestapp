'use client';

import { useEffect, useRef } from 'react';

import {
  getKangurInternalQueryParamName,
  readKangurUrlParam,
  type KangurInternalQueryParamKey,
} from '@/features/kangur/config/routing';
import { kangurGameInstanceIdSchema } from '@/shared/contracts/kangur-game-instances';
import type { KangurUser } from '@kangur/platform';
import {
  claimCurrentKangurDailyQuestReward,
  getCurrentKangurDailyQuest,
} from '@/features/kangur/ui/services/daily-quests';
import { parseKangurMixedTrainingQuickStartParams } from '@/features/kangur/ui/services/delegated-assignments';
import {
  addXp,
  createGameSessionReward,
  getNextLockedBadge,
  loadProgress,
} from '@/features/kangur/ui/services/progress';
import {
  translateKangurProgressWithFallback,
  type KangurProgressTranslate,
} from '@/features/kangur/ui/services/progress-i18n';
import type { KangurLessonSubject } from '@/features/kangur/shared/contracts/kangur';
import type {
  KangurDifficulty,
  KangurGameScreen,
  KangurOperation,
  KangurSessionRecommendationHint,
  KangurSessionStartOptions,
  KangurTrainingSelection,
  KangurXpToastState,
} from '@/features/kangur/ui/types';

import {
  isKangurDifficulty,
  isKangurGameScreen,
  isKangurOperation,
} from './KangurGameRuntimeContext.shared';

type UseKangurGameQuickStartInput = {
  basePath: string;
  isLoadingAuth: boolean;
  playerName: string;
  screen: KangurGameScreen;
  user: KangurUser | null;
  setPlayerName: (value: string) => void;
  setScreen: (screen: KangurGameScreen) => void;
  setLaunchableGameInstanceId: (value: string | null) => void;
  handleSelectOperation: (
    operation: KangurOperation,
    difficulty: KangurDifficulty,
    options?: KangurSessionStartOptions
  ) => void;
  handleStartTraining: (
    selection: KangurTrainingSelection,
    options?: KangurSessionStartOptions
  ) => void;
};

type KangurGameQuickStartPayload = {
  categories?: string | null;
  count?: string | null;
  createdAt?: number;
  difficulty?: string | null;
  instanceId?: string | null;
  operation?: string | null;
  quickStart: string;
  screen?: string | null;
};

type BuildKangurCompletedGameOutcomeInput = {
  activeSessionRecommendation: KangurSessionRecommendationHint | null;
  difficulty: KangurDifficulty;
  nextScore: number;
  operation: KangurOperation | null;
  ownerKey?: string | null;
  subject: KangurLessonSubject;
  taken: number;
  totalQuestions: number;
  allowRewards?: boolean;
  progressTranslate?: KangurProgressTranslate;
  resultTranslate?: KangurProgressTranslate;
};

type BuildKangurCompletedGameOutcomeResult = {
  awardedXp: number;
  awardedBadges: string[];
  awardedBreakdown: KangurXpToastState['breakdown'];
  dailyQuestToastHint: KangurXpToastState['dailyQuest'];
  nextBadgeToastHint: KangurXpToastState['nextBadge'];
  recommendationToastHint: KangurXpToastState['recommendation'];
  selectedOperation: KangurOperation;
  isPerfect: boolean;
  isGreat: boolean;
};

const KANGUR_GAME_PENDING_QUICK_START_STORAGE_KEY = 'kangur:game:pending-quick-start';
const KANGUR_GAME_PENDING_QUICK_START_MAX_AGE_MS = 60_000;

const canUseKangurGameQuickStartStorage = (): boolean =>
  typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

export const clearPendingKangurGameQuickStart = (): void => {
  if (!canUseKangurGameQuickStartStorage()) {
    return;
  }

  try {
    window.sessionStorage.removeItem(KANGUR_GAME_PENDING_QUICK_START_STORAGE_KEY);
  } catch {
    // Ignore storage failures and keep the URL-driven fallback behavior.
  }
};

const persistPendingKangurGameQuickStart = (
  payload: KangurGameQuickStartPayload
): void => {
  if (!canUseKangurGameQuickStartStorage()) {
    return;
  }

  try {
    window.sessionStorage.setItem(
      KANGUR_GAME_PENDING_QUICK_START_STORAGE_KEY,
      JSON.stringify({
        ...payload,
        createdAt: Date.now(),
      } satisfies KangurGameQuickStartPayload)
    );
  } catch {
    // Ignore storage failures and keep the URL-driven fallback behavior.
  }
};

const readPendingKangurGameQuickStart = (): KangurGameQuickStartPayload | null => {
  if (!canUseKangurGameQuickStartStorage()) {
    return null;
  }

  try {
    const rawPayload = window.sessionStorage.getItem(
      KANGUR_GAME_PENDING_QUICK_START_STORAGE_KEY
    );
    if (!rawPayload) {
      return null;
    }

    const parsed = JSON.parse(rawPayload) as Partial<KangurGameQuickStartPayload> | null;
    if (!parsed || typeof parsed.quickStart !== 'string' || parsed.quickStart.trim().length === 0) {
      clearPendingKangurGameQuickStart();
      return null;
    }

    const createdAt =
      typeof parsed.createdAt === 'number' && Number.isFinite(parsed.createdAt)
        ? parsed.createdAt
        : null;
    if (
      createdAt === null ||
      Date.now() - createdAt > KANGUR_GAME_PENDING_QUICK_START_MAX_AGE_MS
    ) {
      clearPendingKangurGameQuickStart();
      return null;
    }

    return {
      categories: parsed.categories ?? null,
      count: parsed.count ?? null,
      createdAt,
      difficulty: parsed.difficulty ?? null,
      instanceId: parsed.instanceId ?? null,
      operation: parsed.operation ?? null,
      quickStart: parsed.quickStart,
      screen: parsed.screen ?? null,
    };
  } catch {
    clearPendingKangurGameQuickStart();
    return null;
  }
};

const readKangurGameQuickStartPayload = (
  searchParams: URLSearchParams,
  basePath: string
): KangurGameQuickStartPayload | null => {
  const quickStart = readKangurUrlParam(searchParams, 'quickStart', basePath);
  if (!quickStart) {
    return null;
  }

  return {
    categories: readKangurUrlParam(searchParams, 'categories', basePath),
    count: readKangurUrlParam(searchParams, 'count', basePath),
    difficulty: readKangurUrlParam(searchParams, 'difficulty', basePath),
    instanceId: readKangurUrlParam(searchParams, 'instanceId', basePath),
    operation: readKangurUrlParam(searchParams, 'operation', basePath),
    quickStart,
    screen: readKangurUrlParam(searchParams, 'screen', basePath),
  };
};

const buildKangurGameQuickStartSearchParams = (
  payload: KangurGameQuickStartPayload
): URLSearchParams => {
  const searchParams = new URLSearchParams();

  if (payload.categories) {
    searchParams.set('categories', payload.categories);
  }
  if (payload.count) {
    searchParams.set('count', payload.count);
  }
  if (payload.difficulty) {
    searchParams.set('difficulty', payload.difficulty);
  }
  if (payload.instanceId) {
    searchParams.set('instanceId', payload.instanceId);
  }
  if (payload.operation) {
    searchParams.set('operation', payload.operation);
  }
  if (payload.quickStart) {
    searchParams.set('quickStart', payload.quickStart);
  }
  if (payload.screen) {
    searchParams.set('screen', payload.screen);
  }

  return searchParams;
};

export const useKangurGameQuickStart = ({
  basePath,
  isLoadingAuth,
  playerName,
  screen,
  user,
  setPlayerName,
  setScreen,
  setLaunchableGameInstanceId,
  handleSelectOperation,
  handleStartTraining,
}: UseKangurGameQuickStartInput): void => {
  const quickStartConsumedRef = useRef(false);

  useEffect(() => {
    if (
      quickStartConsumedRef.current ||
      screen !== 'home' ||
      typeof window === 'undefined' ||
      isLoadingAuth
    ) {
      return;
    }

    const url = new URL(window.location.href);
    const urlQuickStart = readKangurGameQuickStartPayload(url.searchParams, basePath);
    const quickStartPayload = urlQuickStart ?? readPendingKangurGameQuickStart();
    if (!quickStartPayload) {
      return;
    }

    if (urlQuickStart) {
      persistPendingKangurGameQuickStart(urlQuickStart);
    }

    const clearQuickStartParams = (): void => {
      (
        [
          'quickStart',
          'screen',
          'instanceId',
          'operation',
          'categories',
          'count',
          'difficulty',
        ] as const
      ).forEach((key) => {
        url.searchParams.delete(
          getKangurInternalQueryParamName(key as KangurInternalQueryParamKey, basePath)
        );
      });
      const nextHref = `${url.pathname}${url.search}${url.hash}`;
      window.history.replaceState({}, '', nextHref);
    };

    const quickStart = quickStartPayload.quickStart;

    if (quickStart === 'kangur' || quickStart === 'kangur_setup') {
      quickStartConsumedRef.current = true;
      if (!user && playerName.trim().length === 0) {
        setPlayerName('Gracz');
      }

      if (urlQuickStart) {
        clearQuickStartParams();
      }
      setLaunchableGameInstanceId(null);
      setScreen('kangur_setup');
      return;
    }

    if (quickStart === 'training') {
      quickStartConsumedRef.current = true;
      if (!user && playerName.trim().length === 0) {
        setPlayerName('Gracz');
      }

      const trainingPreset = parseKangurMixedTrainingQuickStartParams(
        buildKangurGameQuickStartSearchParams(quickStartPayload),
        basePath
      );
      if (urlQuickStart) {
        clearQuickStartParams();
      }
      if (trainingPreset) {
        setLaunchableGameInstanceId(null);
        handleStartTraining(trainingPreset);
        return;
      }

      setLaunchableGameInstanceId(null);
      setScreen('training');
      return;
    }

    if (quickStart === 'screen') {
      const parsedInstanceId = kangurGameInstanceIdSchema.safeParse(
        quickStartPayload.instanceId
      );

      quickStartConsumedRef.current = true;
      if (!user && playerName.trim().length === 0) {
        setPlayerName('Gracz');
      }

      if (urlQuickStart) {
        clearQuickStartParams();
      }
      setLaunchableGameInstanceId(parsedInstanceId.success ? parsedInstanceId.data : null);
      if (isKangurGameScreen(quickStartPayload.screen)) {
        setScreen(quickStartPayload.screen);
      }
      return;
    }

    if (quickStart !== 'operation') {
      return;
    }

    const nextOperation = isKangurOperation(quickStartPayload.operation)
      ? quickStartPayload.operation
      : null;
    const nextDifficulty = isKangurDifficulty(quickStartPayload.difficulty)
      ? quickStartPayload.difficulty
      : 'medium';

    quickStartConsumedRef.current = true;
    if (!user && playerName.trim().length === 0) {
      setPlayerName('Gracz');
    }
    if (urlQuickStart) {
      clearQuickStartParams();
    }
    if (nextOperation) {
      setLaunchableGameInstanceId(null);
      handleSelectOperation(nextOperation, nextDifficulty);
    } else {
      setLaunchableGameInstanceId(null);
      setScreen('operation');
    }
  }, [
    basePath,
    handleSelectOperation,
    handleStartTraining,
    isLoadingAuth,
    playerName,
    screen,
    setLaunchableGameInstanceId,
    setPlayerName,
    setScreen,
    user,
  ]);
};

export const buildKangurCompletedGameOutcome = ({
  activeSessionRecommendation,
  difficulty,
  nextScore,
  operation,
  ownerKey,
  subject,
  taken,
  totalQuestions,
  allowRewards = true,
  progressTranslate,
  resultTranslate,
}: BuildKangurCompletedGameOutcomeInput): BuildKangurCompletedGameOutcomeResult => {
  const selectedOperation = operation ?? 'mixed';
  const greatThreshold = Math.max(1, Math.ceil(totalQuestions * 0.8));
  const isPerfect = nextScore === totalQuestions;
  const isGreat = nextScore >= greatThreshold;

  if (!allowRewards) {
    return {
      awardedXp: 0,
      awardedBadges: [],
      awardedBreakdown: [],
      dailyQuestToastHint: null,
      nextBadgeToastHint: null,
      recommendationToastHint: null,
      selectedOperation,
      isPerfect,
      isGreat,
    };
  }

  const storedProgress = loadProgress(
    ownerKey !== undefined ? { ownerKey } : undefined
  );
  const sessionReward = createGameSessionReward(storedProgress, {
    operation: selectedOperation,
    difficulty,
    correctAnswers: nextScore,
    followsRecommendation: Boolean(activeSessionRecommendation),
    totalQuestions,
    durationSeconds: taken,
  });

  const dailyQuestBefore = getCurrentKangurDailyQuest(storedProgress, {
    ownerKey: ownerKey ?? null,
    persist: false,
    subject,
    translate: progressTranslate,
  });
  const sessionRewardResult = addXp(
    sessionReward.xp,
    sessionReward.progressUpdates,
    ownerKey !== undefined ? { ownerKey } : undefined
  );
  let awardedXp = sessionReward.xp;
  const awardedBreakdown = [...(sessionReward.breakdown ?? [])];
  let finalProgress = sessionRewardResult.updated;
  const questClaim = claimCurrentKangurDailyQuestReward(finalProgress, {
    ownerKey: ownerKey ?? null,
    subject,
    translate: progressTranslate,
  });
  let awardedBadges = [...sessionRewardResult.newBadges];
  let dailyQuestAfter = questClaim.quest;

  if (questClaim.xpAwarded > 0) {
    const questBonusResult = addXp(
      questClaim.xpAwarded,
      {
        dailyQuestsCompleted: (finalProgress.dailyQuestsCompleted ?? 0) + 1,
      },
      ownerKey !== undefined ? { ownerKey } : undefined
    );
    awardedXp += questClaim.xpAwarded;
    awardedBreakdown.push({
      kind: 'daily_quest',
      label: translateKangurProgressWithFallback(
        progressTranslate,
        'rewardBreakdown.dailyQuest',
        'Misja dnia',
      ),
      xp: questClaim.xpAwarded,
    });
    finalProgress = questBonusResult.updated;
    awardedBadges = Array.from(new Set([...awardedBadges, ...questBonusResult.newBadges]));
    dailyQuestAfter = questClaim.quest;
  }

  const nextBadge = getNextLockedBadge(finalProgress, {
    translate: progressTranslate,
  });
  const nextBadgeToastHint = nextBadge
    ? {
      emoji: nextBadge.emoji,
      name: nextBadge.name,
      summary: nextBadge.summary,
    }
    : null;
  const dailyQuestToastHint =
    dailyQuestAfter?.progress.status === 'completed' &&
    dailyQuestBefore?.progress.status !== 'completed'
      ? {
        title: dailyQuestAfter.assignment.title,
        summary: dailyQuestAfter.progress.summary,
        xpAwarded: questClaim.xpAwarded,
      }
      : null;
  const recommendationToastHint = activeSessionRecommendation
    ? {
      label: activeSessionRecommendation.label,
      title: activeSessionRecommendation.title,
      summary: dailyQuestToastHint
        ? translateKangurProgressWithFallback(
            resultTranslate,
            'xpToast.recommendationSummaryWithQuest',
            'Ten ruch domknął polecany kierunek i misję dnia.'
          )
        : nextBadgeToastHint
          ? translateKangurProgressWithFallback(
              resultTranslate,
              'xpToast.recommendationSummaryWithBadge',
              'Ten ruch najmocniej przybliża odznakę {badge}.',
              { badge: nextBadgeToastHint.name }
            )
          : translateKangurProgressWithFallback(
              resultTranslate,
              'xpToast.recommendationSummaryDefault',
              'To był najmocniejszy ruch dla bieżącego postępu.'
            ),
    }
    : null;

  return {
    awardedXp,
    awardedBadges,
    awardedBreakdown,
    dailyQuestToastHint,
    nextBadgeToastHint,
    recommendationToastHint,
    selectedOperation,
    isPerfect,
    isGreat,
  };
};
