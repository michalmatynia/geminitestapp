import { useEffect, useRef } from 'react';

import {
  getKangurInternalQueryParamName,
  readKangurUrlParam,
  type KangurInternalQueryParamKey,
} from '@/features/kangur/config/routing';
import type { KangurUser } from '@/features/kangur/services/ports';
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
import type {
  KangurDifficulty,
  KangurGameScreen,
  KangurOperation,
  KangurSessionRecommendationHint,
  KangurSessionStartOptions,
  KangurTrainingSelection,
  KangurXpToastState,
} from '@/features/kangur/ui/types';

import { isKangurDifficulty, isKangurOperation } from './KangurGameRuntimeContext.shared';

type UseKangurGameQuickStartInput = {
  basePath: string;
  isLoadingAuth: boolean;
  playerName: string;
  screen: KangurGameScreen;
  user: KangurUser | null;
  setPlayerName: (value: string) => void;
  setScreen: (screen: KangurGameScreen) => void;
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

type BuildKangurCompletedGameOutcomeInput = {
  activeSessionRecommendation: KangurSessionRecommendationHint | null;
  difficulty: KangurDifficulty;
  nextScore: number;
  operation: KangurOperation | null;
  taken: number;
  totalQuestions: number;
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

export const useKangurGameQuickStart = ({
  basePath,
  isLoadingAuth,
  playerName,
  screen,
  user,
  setPlayerName,
  setScreen,
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
    const quickStart = readKangurUrlParam(url.searchParams, 'quickStart', basePath);
    if (!quickStart) {
      return;
    }

    const clearQuickStartParams = (): void => {
      (['quickStart', 'operation', 'categories', 'count', 'difficulty'] as const).forEach((key) => {
        url.searchParams.delete(
          getKangurInternalQueryParamName(key as KangurInternalQueryParamKey, basePath)
        );
      });
      const nextHref = `${url.pathname}${url.search}${url.hash}`;
      window.history.replaceState({}, '', nextHref);
    };

    if (quickStart === 'training') {
      quickStartConsumedRef.current = true;
      if (!user && playerName.trim().length === 0) {
        setPlayerName('Gracz');
      }

      const trainingPreset = parseKangurMixedTrainingQuickStartParams(url.searchParams, basePath);
      clearQuickStartParams();
      if (trainingPreset) {
        handleStartTraining(trainingPreset);
        return;
      }

      setScreen('training');
      return;
    }

    if (quickStart !== 'operation') {
      return;
    }

    const requestedOperation = readKangurUrlParam(url.searchParams, 'operation', basePath);
    const requestedDifficulty = readKangurUrlParam(url.searchParams, 'difficulty', basePath);
    const nextOperation = isKangurOperation(requestedOperation) ? requestedOperation : null;
    const nextDifficulty = isKangurDifficulty(requestedDifficulty) ? requestedDifficulty : 'medium';

    quickStartConsumedRef.current = true;
    if (!user && playerName.trim().length === 0) {
      setPlayerName('Gracz');
    }
    clearQuickStartParams();
    if (nextOperation) {
      handleSelectOperation(nextOperation, nextDifficulty);
    } else {
      setScreen('operation');
    }
  }, [
    basePath,
    handleSelectOperation,
    handleStartTraining,
    isLoadingAuth,
    playerName,
    screen,
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
  taken,
  totalQuestions,
}: BuildKangurCompletedGameOutcomeInput): BuildKangurCompletedGameOutcomeResult => {
  const selectedOperation = operation ?? 'mixed';
  const greatThreshold = Math.max(1, Math.ceil(totalQuestions * 0.8));
  const storedProgress = loadProgress();
  const sessionReward = createGameSessionReward(storedProgress, {
    operation: selectedOperation,
    difficulty,
    correctAnswers: nextScore,
    followsRecommendation: Boolean(activeSessionRecommendation),
    totalQuestions,
    durationSeconds: taken,
  });

  const isPerfect = nextScore === totalQuestions;
  const isGreat = nextScore >= greatThreshold;
  const dailyQuestBefore = getCurrentKangurDailyQuest(storedProgress, { persist: false });
  const sessionRewardResult = addXp(sessionReward.xp, sessionReward.progressUpdates);
  let awardedXp = sessionReward.xp;
  const awardedBreakdown = [...(sessionReward.breakdown ?? [])];
  let finalProgress = sessionRewardResult.updated;
  const questClaim = claimCurrentKangurDailyQuestReward(finalProgress);
  let awardedBadges = [...sessionRewardResult.newBadges];
  let dailyQuestAfter = questClaim.quest;

  if (questClaim.xpAwarded > 0) {
    const questBonusResult = addXp(questClaim.xpAwarded, {
      dailyQuestsCompleted: (finalProgress.dailyQuestsCompleted ?? 0) + 1,
    });
    awardedXp += questClaim.xpAwarded;
    awardedBreakdown.push({
      kind: 'daily_quest',
      label: 'Misja dnia',
      xp: questClaim.xpAwarded,
    });
    finalProgress = questBonusResult.updated;
    awardedBadges = Array.from(new Set([...awardedBadges, ...questBonusResult.newBadges]));
    dailyQuestAfter = questClaim.quest;
  }

  const nextBadge = getNextLockedBadge(finalProgress);
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
        ? 'Ten ruch domknął polecany kierunek i misję dnia.'
        : nextBadgeToastHint
          ? `Ten ruch najmocniej przybliża odznakę ${nextBadgeToastHint.name}.`
          : 'To był najmocniejszy ruch dla bieżącego postępu.',
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
