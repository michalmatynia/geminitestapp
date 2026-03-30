'use client';

import { generateQuestions, generateTrainingQuestions } from '@kangur/core';
import { useCallback, useEffect, type Dispatch, type SetStateAction } from 'react';

import { trackKangurClientEvent } from '@/features/kangur/observability/client';
import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import { resolveKangurScoreSubject } from '@/shared/contracts/kangur';
import type { KangurUser } from '@kangur/platform';

import {
  buildKangurCompletedGameOutcome,
  clearPendingKangurGameQuickStart,
} from '../KangurGameRuntimeContext.helpers';
import { TOTAL_QUESTIONS } from '../KangurGameRuntimeContext.shared';

import type {
  KangurDifficulty,
  KangurGameScreen,
  KangurMode,
  KangurOperation,
  KangurQuestion,
  KangurSessionStartOptions,
  KangurTrainingSelection,
  KangurXpToastState,
} from '../../types';

const kangurPlatform = getKangurPlatform();

type Setter<T> = Dispatch<SetStateAction<T>>;

type UseKangurGameRuntimeActionsInput = {
  activeSessionRecommendation: Parameters<typeof buildKangurCompletedGameOutcome>[0]['activeSessionRecommendation'];
  canAccessParentAssignments: boolean;
  currentQuestionIndex: number;
  difficulty: KangurDifficulty;
  guestPlayerName: string;
  kangurMode: KangurMode | null;
  operation: KangurOperation | null;
  refreshAssignments: () => unknown;
  resultTranslate: Parameters<typeof buildKangurCompletedGameOutcome>[0]['resultTranslate'];
  progressTranslate: Parameters<typeof buildKangurCompletedGameOutcome>[0]['progressTranslate'];
  runGameLoopTimer: (fn: () => void, ms: number) => void;
  screen: KangurGameScreen;
  score: number;
  sessionPlayerName: string;
  setActiveSessionRecommendation: Setter<Parameters<typeof buildKangurCompletedGameOutcome>[0]['activeSessionRecommendation']>;
  setCurrentQuestionIndex: Setter<number>;
  setDifficulty: Setter<KangurDifficulty>;
  setGuestPlayerName: (value: string) => void;
  setKangurMode: Setter<KangurMode | null>;
  setLaunchableGameInstanceId: Setter<string | null>;
  setOperation: Setter<KangurOperation | null>;
  setQuestions: Setter<KangurQuestion[]>;
  setScore: Setter<number>;
  setScreen: Setter<KangurGameScreen>;
  setSessionPlayerName: Setter<string>;
  setStartTime: Setter<number | null>;
  setTimeTaken: Setter<number>;
  setXpToast: Setter<KangurXpToastState>;
  showXpToast: (
    xpGained: number,
    newBadges: string[],
    breakdown?: KangurXpToastState['breakdown'],
    nextBadge?: KangurXpToastState['nextBadge'],
    dailyQuest?: KangurXpToastState['dailyQuest'],
    recommendation?: KangurXpToastState['recommendation']
  ) => void;
  startTime: number | null;
  subject: Parameters<typeof buildKangurCompletedGameOutcome>[0]['subject'];
  subjectKey: Parameters<typeof buildKangurCompletedGameOutcome>[0]['ownerKey'];
  totalQuestions: number;
  user: KangurUser | null;
};

type UseKangurGameRuntimeActionsResult = {
  handleAnswer: (correct: boolean) => void;
  handleHome: () => void;
  handleRestart: () => void;
  handleSelectOperation: (
    nextOperation: KangurOperation,
    nextDifficulty: KangurDifficulty,
    options?: KangurSessionStartOptions
  ) => void;
  handleStartGame: () => void;
  handleStartKangur: (mode: KangurMode, options?: KangurSessionStartOptions) => void;
  handleStartTraining: (
    selection: KangurTrainingSelection,
    options?: KangurSessionStartOptions
  ) => void;
  playerName: string;
  setPlayerName: (value: string) => void;
};

const buildHiddenXpToastState = (): KangurXpToastState => ({
  visible: false,
  xpGained: 0,
  newBadges: [],
  breakdown: [],
  nextBadge: null,
  dailyQuest: null,
  recommendation: null,
});

const resolveRuntimePlayerName = ({
  guestPlayerName,
  sessionPlayerName,
  user,
}: {
  guestPlayerName: string;
  sessionPlayerName: string;
  user: KangurUser | null;
}): string => user?.full_name?.trim() || sessionPlayerName || guestPlayerName;

const resolveSessionPlayerName = ({
  guestPlayerName,
  user,
}: {
  guestPlayerName: string;
  user: KangurUser | null;
}): string => guestPlayerName.trim() || user?.full_name?.trim() || 'Gracz';

const applyQuestionSessionState = ({
  nextDifficulty,
  nextOperation,
  nextQuestions,
  options,
  setActiveSessionRecommendation,
  setCurrentQuestionIndex,
  setDifficulty,
  setLaunchableGameInstanceId,
  setOperation,
  setQuestions,
  setScore,
  setScreen,
  setStartTime,
  setTimeTaken,
}: {
  nextDifficulty: KangurDifficulty;
  nextOperation: KangurOperation;
  nextQuestions: KangurQuestion[];
  options?: KangurSessionStartOptions;
  setActiveSessionRecommendation: UseKangurGameRuntimeActionsInput['setActiveSessionRecommendation'];
  setCurrentQuestionIndex: Setter<number>;
  setDifficulty: Setter<KangurDifficulty>;
  setLaunchableGameInstanceId: Setter<string | null>;
  setOperation: Setter<KangurOperation | null>;
  setQuestions: Setter<KangurQuestion[]>;
  setScore: Setter<number>;
  setScreen: Setter<KangurGameScreen>;
  setStartTime: Setter<number | null>;
  setTimeTaken: Setter<number>;
}): void => {
  setLaunchableGameInstanceId(null);
  setOperation(nextOperation);
  setDifficulty(nextDifficulty);
  setQuestions(nextQuestions);
  setCurrentQuestionIndex(0);
  setScore(0);
  setTimeTaken(0);
  setStartTime(Date.now());
  setActiveSessionRecommendation(options?.recommendation ?? null);
  setScreen('playing');
};

const showCompletedGameToast = ({
  canEarnRewards,
  outcome,
  showXpToast,
}: {
  canEarnRewards: boolean;
  outcome: ReturnType<typeof buildKangurCompletedGameOutcome>;
  showXpToast: UseKangurGameRuntimeActionsInput['showXpToast'];
}): void => {
  if (!canEarnRewards) {
    return;
  }
  showXpToast(
    outcome.awardedXp,
    outcome.awardedBadges,
    outcome.awardedBreakdown,
    outcome.nextBadgeToastHint,
    outcome.dailyQuestToastHint,
    outcome.recommendationToastHint
  );
};

const scheduleNextQuestion = (
  runGameLoopTimer: UseKangurGameRuntimeActionsInput['runGameLoopTimer'],
  setCurrentQuestionIndex: Setter<number>
): void => {
  runGameLoopTimer(() => {
    setCurrentQuestionIndex((current) => current + 1);
  }, 1000);
};

const scheduleResultScreen = (
  runGameLoopTimer: UseKangurGameRuntimeActionsInput['runGameLoopTimer'],
  setScreen: Setter<KangurGameScreen>
): void => {
  runGameLoopTimer(() => setScreen('result'), 1000);
};

const buildCompletedGameTrackingPayload = ({
  difficulty,
  kangurMode,
  nextPlayerName,
  nextScore,
  outcome,
  screen,
  totalQuestions,
}: {
  difficulty: KangurDifficulty;
  kangurMode: KangurMode | null;
  nextPlayerName: string;
  nextScore: number;
  outcome: ReturnType<typeof buildKangurCompletedGameOutcome>;
  screen: KangurGameScreen;
  totalQuestions: number;
}) => ({
  operation: outcome.selectedOperation,
  difficulty,
  screen,
  kangurMode: kangurMode ?? 'practice',
  totalQuestions,
  correctAnswers: nextScore,
  accuracyPercent: Math.round((nextScore / totalQuestions) * 100),
  isPerfect: outcome.isPerfect,
  isGreat: outcome.isGreat,
  xpAwarded: outcome.awardedXp,
  playerNamePresent: nextPlayerName.length > 0,
});

const completeGameAnswer = ({
  activeSessionRecommendation,
  canAccessParentAssignments,
  canEarnRewards,
  difficulty,
  kangurMode,
  nextPlayerName,
  nextScore,
  operation,
  progressTranslate,
  refreshAssignments,
  resultTranslate,
  runGameLoopTimer,
  screen,
  setScore,
  setScreen,
  setTimeTaken,
  showXpToast,
  startTime,
  subject,
  subjectKey,
  totalQuestions,
}: {
  activeSessionRecommendation: UseKangurGameRuntimeActionsInput['activeSessionRecommendation'];
  canAccessParentAssignments: boolean;
  canEarnRewards: boolean;
  difficulty: KangurDifficulty;
  kangurMode: KangurMode | null;
  nextPlayerName: string;
  nextScore: number;
  operation: KangurOperation | null;
  progressTranslate: UseKangurGameRuntimeActionsInput['progressTranslate'];
  refreshAssignments: () => unknown;
  resultTranslate: UseKangurGameRuntimeActionsInput['resultTranslate'];
  runGameLoopTimer: UseKangurGameRuntimeActionsInput['runGameLoopTimer'];
  screen: KangurGameScreen;
  setScore: Setter<number>;
  setScreen: Setter<KangurGameScreen>;
  setTimeTaken: Setter<number>;
  showXpToast: UseKangurGameRuntimeActionsInput['showXpToast'];
  startTime: number | null;
  subject: UseKangurGameRuntimeActionsInput['subject'];
  subjectKey: UseKangurGameRuntimeActionsInput['subjectKey'];
  totalQuestions: number;
}): void => {
  const taken = Math.round((Date.now() - (startTime ?? Date.now())) / 1000);
  setTimeTaken(taken);
  setScore(nextScore);
  const outcome = buildKangurCompletedGameOutcome({
    activeSessionRecommendation,
    difficulty,
    nextScore,
    operation,
    ownerKey: subjectKey,
    subject,
    taken,
    totalQuestions,
    allowRewards: canEarnRewards,
    progressTranslate,
    resultTranslate,
  });

  if (canEarnRewards) {
    void kangurPlatform.score
      .create({
        player_name: nextPlayerName,
        score: nextScore,
        operation: outcome.selectedOperation,
        subject: resolveKangurScoreSubject({
          operation: outcome.selectedOperation,
          subject,
        }),
        total_questions: totalQuestions,
        correct_answers: nextScore,
        time_taken: taken,
        xp_earned: outcome.awardedXp,
      })
      .finally(() => {
        if (canAccessParentAssignments) {
          void refreshAssignments();
        }
      });
  }

  trackKangurClientEvent(
    'kangur_game_completed',
    buildCompletedGameTrackingPayload({
      difficulty,
      kangurMode,
      nextPlayerName,
      nextScore,
      outcome,
      screen,
      totalQuestions,
    })
  );
  showCompletedGameToast({
    canEarnRewards,
    outcome,
    showXpToast,
  });
  scheduleResultScreen(runGameLoopTimer, setScreen);
};

const useRewardAvailabilitySync = ({
  canEarnRewards,
  setXpToast,
}: {
  canEarnRewards: boolean;
  setXpToast: Setter<KangurXpToastState>;
}): void => {
  useEffect(() => {
    if (canEarnRewards) {
      return;
    }
    setXpToast(buildHiddenXpToastState());
  }, [canEarnRewards, setXpToast]);
};

const useSessionPlayerNameSync = ({
  sessionPlayerName,
  setSessionPlayerName,
  user,
}: {
  sessionPlayerName: string;
  setSessionPlayerName: Setter<string>;
  user: KangurUser | null;
}): void => {
  useEffect(() => {
    const fullName = user?.full_name?.trim();
    if (!fullName || sessionPlayerName === fullName) {
      return;
    }
    setSessionPlayerName(fullName);
  }, [sessionPlayerName, setSessionPlayerName, user?.full_name]);
};

export const canEarnKangurRewards = (user: KangurUser | null): boolean =>
  !(user?.actorType === 'parent' && !user?.activeLearner?.id);

export function useKangurGameRuntimeActions(
  input: UseKangurGameRuntimeActionsInput
): UseKangurGameRuntimeActionsResult {
  const canEarnRewards = canEarnKangurRewards(input.user);
  useRewardAvailabilitySync({
    canEarnRewards,
    setXpToast: input.setXpToast,
  });
  useSessionPlayerNameSync({
    sessionPlayerName: input.sessionPlayerName,
    setSessionPlayerName: input.setSessionPlayerName,
    user: input.user,
  });

  const playerName = resolveRuntimePlayerName({
    guestPlayerName: input.guestPlayerName,
    sessionPlayerName: input.sessionPlayerName,
    user: input.user,
  });
  const setPlayerName = input.setGuestPlayerName;

  const ensureSessionPlayerName = useCallback((): string => {
    const nextPlayerName = resolveSessionPlayerName({
      guestPlayerName: input.guestPlayerName,
      user: input.user,
    });
    if (input.sessionPlayerName !== nextPlayerName) {
      input.setSessionPlayerName(nextPlayerName);
    }
    return nextPlayerName;
  }, [input.guestPlayerName, input.sessionPlayerName, input.setSessionPlayerName, input.user]);

  const handleStartTraining = useCallback(
    (selection: KangurTrainingSelection, options?: KangurSessionStartOptions): void => {
      ensureSessionPlayerName();
      applyQuestionSessionState({
        nextDifficulty: selection.difficulty,
        nextOperation: 'mixed',
        nextQuestions: generateTrainingQuestions(
          selection.categories,
          selection.difficulty,
          selection.count
        ),
        options,
        setActiveSessionRecommendation: input.setActiveSessionRecommendation,
        setCurrentQuestionIndex: input.setCurrentQuestionIndex,
        setDifficulty: input.setDifficulty,
        setLaunchableGameInstanceId: input.setLaunchableGameInstanceId,
        setOperation: input.setOperation,
        setQuestions: input.setQuestions,
        setScore: input.setScore,
        setScreen: input.setScreen,
        setStartTime: input.setStartTime,
        setTimeTaken: input.setTimeTaken,
      });
    },
    [
      ensureSessionPlayerName,
      input.setActiveSessionRecommendation,
      input.setCurrentQuestionIndex,
      input.setDifficulty,
      input.setLaunchableGameInstanceId,
      input.setOperation,
      input.setQuestions,
      input.setScore,
      input.setScreen,
      input.setStartTime,
      input.setTimeTaken,
    ]
  );

  const handleSelectOperation = useCallback(
    (
      nextOperation: KangurOperation,
      nextDifficulty: KangurDifficulty,
      options?: KangurSessionStartOptions
    ): void => {
      ensureSessionPlayerName();
      applyQuestionSessionState({
        nextDifficulty,
        nextOperation,
        nextQuestions: generateQuestions(nextOperation, nextDifficulty, TOTAL_QUESTIONS),
        options,
        setActiveSessionRecommendation: input.setActiveSessionRecommendation,
        setCurrentQuestionIndex: input.setCurrentQuestionIndex,
        setDifficulty: input.setDifficulty,
        setLaunchableGameInstanceId: input.setLaunchableGameInstanceId,
        setOperation: input.setOperation,
        setQuestions: input.setQuestions,
        setScore: input.setScore,
        setScreen: input.setScreen,
        setStartTime: input.setStartTime,
        setTimeTaken: input.setTimeTaken,
      });
    },
    [
      ensureSessionPlayerName,
      input.setActiveSessionRecommendation,
      input.setCurrentQuestionIndex,
      input.setDifficulty,
      input.setLaunchableGameInstanceId,
      input.setOperation,
      input.setQuestions,
      input.setScore,
      input.setScreen,
      input.setStartTime,
      input.setTimeTaken,
    ]
  );

  const handleAnswer = useCallback(
    (correct: boolean): void => {
      const nextScore = correct ? input.score + 1 : input.score;
      const isLastQuestion = input.currentQuestionIndex + 1 >= input.totalQuestions;

      if (isLastQuestion) {
        completeGameAnswer({
          activeSessionRecommendation: input.activeSessionRecommendation,
          canAccessParentAssignments: input.canAccessParentAssignments,
          canEarnRewards,
          kangurMode: input.kangurMode,
          difficulty: input.difficulty,
          nextPlayerName: ensureSessionPlayerName(),
          nextScore,
          operation: input.operation,
          progressTranslate: input.progressTranslate,
          refreshAssignments: input.refreshAssignments,
          resultTranslate: input.resultTranslate,
          runGameLoopTimer: input.runGameLoopTimer,
          screen: input.screen,
          setScore: input.setScore,
          setScreen: input.setScreen,
          setTimeTaken: input.setTimeTaken,
          showXpToast: input.showXpToast,
          startTime: input.startTime,
          subject: input.subject,
          subjectKey: input.subjectKey,
          totalQuestions: input.totalQuestions,
        });
        return;
      }

      if (correct) {
        input.setScore(nextScore);
      }
      scheduleNextQuestion(input.runGameLoopTimer, input.setCurrentQuestionIndex);
    },
    [
      canEarnRewards,
      ensureSessionPlayerName,
      input.activeSessionRecommendation,
      input.canAccessParentAssignments,
      input.currentQuestionIndex,
      input.difficulty,
      input.kangurMode,
      input.operation,
      input.progressTranslate,
      input.refreshAssignments,
      input.resultTranslate,
      input.runGameLoopTimer,
      input.score,
      input.screen,
      input.setCurrentQuestionIndex,
      input.setScore,
      input.setScreen,
      input.setTimeTaken,
      input.showXpToast,
      input.startTime,
      input.subject,
      input.subjectKey,
      input.totalQuestions,
    ]
  );

  const handleStartGame = useCallback((): void => {
    clearPendingKangurGameQuickStart();
    ensureSessionPlayerName();
    input.setActiveSessionRecommendation(null);
    input.setLaunchableGameInstanceId(null);
    input.setScreen('operation');
  }, [
    ensureSessionPlayerName,
    input.setActiveSessionRecommendation,
    input.setLaunchableGameInstanceId,
    input.setScreen,
  ]);

  const handleStartKangur = useCallback(
    (mode: KangurMode, options?: KangurSessionStartOptions): void => {
      clearPendingKangurGameQuickStart();
      ensureSessionPlayerName();
      input.setKangurMode(mode);
      input.setActiveSessionRecommendation(options?.recommendation ?? null);
      input.setLaunchableGameInstanceId(null);
      input.setScreen('kangur');
    },
    [
      ensureSessionPlayerName,
      input.setActiveSessionRecommendation,
      input.setKangurMode,
      input.setLaunchableGameInstanceId,
      input.setScreen,
    ]
  );

  const handleRestart = useCallback((): void => {
    clearPendingKangurGameQuickStart();
    input.setActiveSessionRecommendation(null);
    input.setLaunchableGameInstanceId(null);
    input.setScreen('operation');
  }, [input.setActiveSessionRecommendation, input.setLaunchableGameInstanceId, input.setScreen]);

  const handleHome = useCallback((): void => {
    clearPendingKangurGameQuickStart();
    input.setActiveSessionRecommendation(null);
    input.setLaunchableGameInstanceId(null);
    input.setScreen('home');
  }, [input.setActiveSessionRecommendation, input.setLaunchableGameInstanceId, input.setScreen]);

  return {
    handleAnswer,
    handleHome,
    handleRestart,
    handleSelectOperation,
    handleStartGame,
    handleStartKangur,
    handleStartTraining,
    playerName,
    setPlayerName,
  };
}
