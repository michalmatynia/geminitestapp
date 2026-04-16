'use client';

import { generateQuestions, generateTrainingQuestions } from '@kangur/core';
import { useCallback, useEffect, type Dispatch, type SetStateAction } from 'react';

import { trackKangurClientEvent } from '@/features/kangur/observability/client';
import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import { resolveKangurScoreSubject } from '@/shared/contracts/kangur';
import type { KangurGameInstanceId } from '@/shared/contracts/kangur-game-instances';
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
type StartSession = (payload: {
  difficulty: KangurDifficulty;
  operation: KangurOperation;
  questions: KangurQuestion[];
  startTime: number;
  recommendation: Parameters<typeof buildKangurCompletedGameOutcome>[0]['activeSessionRecommendation'];
}) => void;
type CompleteSession = (payload: { score: number; timeTaken: number }) => void;
type ResetGame = (payload: {
  screen: KangurGameScreen;
  recommendation: Parameters<typeof buildKangurCompletedGameOutcome>[0]['activeSessionRecommendation'];
  launchableGameInstanceId: KangurGameInstanceId | null;
}) => void;

type UseKangurGameRuntimeActionsInput = {
  activeSessionRecommendation: Parameters<typeof buildKangurCompletedGameOutcome>[0]['activeSessionRecommendation'];
  advanceQuestion: () => void;
  canAccessParentAssignments: boolean;
  completeSession: CompleteSession;
  currentQuestionIndex: number;
  difficulty: KangurDifficulty;
  guestPlayerName: string;
  kangurMode: KangurMode | null;
  operation: KangurOperation | null;
  refreshAssignments: () => unknown;
  resultTranslate: Parameters<typeof buildKangurCompletedGameOutcome>[0]['resultTranslate'];
  progressTranslate: Parameters<typeof buildKangurCompletedGameOutcome>[0]['progressTranslate'];
  resetGame: ResetGame;
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
  startSession: StartSession;
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

// Returns a hidden (invisible) XP toast state. Used to clear the toast when
// rewards become unavailable (e.g. parent account without an active learner).
const buildHiddenXpToastState = (): KangurXpToastState => ({
  visible: false,
  xpGained: 0,
  newBadges: [],
  breakdown: [],
  nextBadge: null,
  dailyQuest: null,
  recommendation: null,
});

// Resolves the display name shown during gameplay. Priority:
//  1. Authenticated user's full name
//  2. Session player name (set at game start)
//  3. Guest player name (entered on the home screen)
const resolveRuntimePlayerName = ({
  guestPlayerName,
  sessionPlayerName,
  user,
}: {
  guestPlayerName: string;
  sessionPlayerName: string;
  user: KangurUser | null;
}): string => user?.full_name?.trim() || sessionPlayerName || guestPlayerName;

// Resolves the player name to persist in the score record. Falls back to
// the authenticated user's name, then to a generic default ('Gracz').
const resolveSessionPlayerName = ({
  guestPlayerName,
  user,
}: {
  guestPlayerName: string;
  user: KangurUser | null;
}): string => guestPlayerName.trim() || user?.full_name?.trim() || 'Gracz';

// Atomically starts a new game session by dispatching START_SESSION with the
// generated question set, operation, difficulty, and start timestamp.
const applyQuestionSessionState = ({
  nextDifficulty,
  nextOperation,
  nextQuestions,
  options,
  startSession,
}: {
  nextDifficulty: KangurDifficulty;
  nextOperation: KangurOperation;
  nextQuestions: KangurQuestion[];
  options?: KangurSessionStartOptions;
  startSession: StartSession;
}): void => {
  startSession({
    difficulty: nextDifficulty,
    operation: nextOperation,
    questions: nextQuestions,
    startTime: Date.now(),
    recommendation: options?.recommendation ?? null,
  });
};

// Shows the XP reward toast after a completed game session. Skipped when the
// current user cannot earn rewards (e.g. parent account without a learner).
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

// Schedules the next question to appear after a 1 s delay, giving the learner
// brief visual feedback on their answer before the question changes.
const scheduleNextQuestion = (
  runGameLoopTimer: UseKangurGameRuntimeActionsInput['runGameLoopTimer'],
  advanceQuestion: UseKangurGameRuntimeActionsInput['advanceQuestion']
): void => {
  runGameLoopTimer(() => {
    advanceQuestion();
  }, 1000);
};

// Schedules the transition to the result screen after a 1 s delay so the
// learner sees the final answer feedback before the results appear.
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

// completeGameAnswer handles the final answer in a session:
//  1. Records elapsed time and dispatches COMPLETE_SESSION.
//  2. Builds the outcome (XP, badges, recommendations) via kangur-core.
//  3. Persists the score to the backend (fire-and-forget) when rewards apply.
//  4. Refreshes parent assignments so the UI reflects completed work.
//  5. Tracks the game_completed analytics event.
//  6. Shows the XP toast and schedules the result screen transition.
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
  completeSession,
  setScreen,
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
  completeSession: CompleteSession;
  setScreen: Setter<KangurGameScreen>;
  showXpToast: UseKangurGameRuntimeActionsInput['showXpToast'];
  startTime: number | null;
  subject: UseKangurGameRuntimeActionsInput['subject'];
  subjectKey: UseKangurGameRuntimeActionsInput['subjectKey'];
  totalQuestions: number;
}): void => {
  const taken = Math.round((Date.now() - (startTime ?? Date.now())) / 1000);
  completeSession({ score: nextScore, timeTaken: taken });
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

// Hides the XP toast whenever the user loses reward eligibility (e.g. they
// switch to a parent account without an active learner mid-session).
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

// Keeps the session player name in sync with the authenticated user's full
// name. Runs whenever the user object changes (e.g. after learner selection).
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

// Parent accounts without an active learner cannot earn XP or badges.
export const canEarnKangurRewards = (user: KangurUser | null): boolean =>
  !(user?.actorType === 'parent' && !user?.activeLearner?.id);

// useKangurGameRuntimeActions produces all stable action callbacks for the
// game runtime. It is intentionally separate from useKangurGameCore so the
// heavy action logic (score persistence, analytics, XP) doesn't live in the
// reducer and can be tested independently.
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
        startSession: input.startSession,
      });
    },
    [ensureSessionPlayerName, input.startSession]
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
        startSession: input.startSession,
      });
    },
    [ensureSessionPlayerName, input.startSession]
  );

  // handleAnswer processes a single question answer:
  //  - Increments score on correct answers.
  //  - On the last question, calls completeGameAnswer (score persist + result).
  //  - Otherwise schedules the next question after a 1 s feedback delay.
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
          completeSession: input.completeSession,
          setScreen: input.setScreen,
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
      scheduleNextQuestion(input.runGameLoopTimer, input.advanceQuestion);
    },
    [
      input.advanceQuestion,
      canEarnRewards,
      input.completeSession,
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
      input.setScore,
      input.setScreen,
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
    input.resetGame({
      screen: 'operation',
      recommendation: null,
      launchableGameInstanceId: null,
    });
  }, [ensureSessionPlayerName, input.resetGame]);

  const handleStartKangur = useCallback(
    (mode: KangurMode, options?: KangurSessionStartOptions): void => {
      clearPendingKangurGameQuickStart();
      ensureSessionPlayerName();
      input.setKangurMode(mode);
      input.resetGame({
        screen: 'kangur',
        recommendation: options?.recommendation ?? null,
        launchableGameInstanceId: null,
      });
    },
    [ensureSessionPlayerName, input.resetGame, input.setKangurMode]
  );

  const handleRestart = useCallback((): void => {
    clearPendingKangurGameQuickStart();
    input.resetGame({
      screen: 'operation',
      recommendation: null,
      launchableGameInstanceId: null,
    });
  }, [input.resetGame]);

  const handleHome = useCallback((): void => {
    clearPendingKangurGameQuickStart();
    input.resetGame({
      screen: 'home',
      recommendation: null,
      launchableGameInstanceId: null,
    });
  }, [input.resetGame]);

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
