/**
 * @vitest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  KangurQuestion,
  KangurSessionRecommendationHint,
} from '../../types';

const {
  buildKangurCompletedGameOutcomeMock,
  clearPendingKangurGameQuickStartMock,
  generateQuestionsMock,
  generateTrainingQuestionsMock,
  resolveKangurScoreSubjectMock,
  scoreCreateMock,
  trackKangurClientEventMock,
} = vi.hoisted(() => ({
  buildKangurCompletedGameOutcomeMock: vi.fn(),
  clearPendingKangurGameQuickStartMock: vi.fn(),
  generateQuestionsMock: vi.fn(),
  generateTrainingQuestionsMock: vi.fn(),
  resolveKangurScoreSubjectMock: vi.fn(),
  scoreCreateMock: vi.fn(),
  trackKangurClientEventMock: vi.fn(),
}));

vi.mock('@kangur/core', () => ({
  generateQuestions: generateQuestionsMock,
  generateTrainingQuestions: generateTrainingQuestionsMock,
}));

vi.mock('@/features/kangur/observability/client', () => ({
  trackKangurClientEvent: trackKangurClientEventMock,

  isRecoverableKangurClientFetchError: vi.fn().mockReturnValue(false),}));

vi.mock('@/features/kangur/services/kangur-platform', () => ({
  getKangurPlatform: () => ({
    score: {
      create: scoreCreateMock,
    },
  }),
}));

vi.mock('@/shared/contracts/kangur', () => ({
  resolveKangurScoreSubject: resolveKangurScoreSubjectMock,
}));

vi.mock('../KangurGameRuntimeContext.helpers', () => ({
  buildKangurCompletedGameOutcome: buildKangurCompletedGameOutcomeMock,
  clearPendingKangurGameQuickStart: clearPendingKangurGameQuickStartMock,
}));

import {
  canEarnKangurRewards,
  useKangurGameRuntimeActions,
} from './useKangurGameRuntimeActions';

const createQuestion = (id: string): KangurQuestion => ({ id } as KangurQuestion);

const createRecommendation = (): KangurSessionRecommendationHint => ({
  label: 'Try again',
  source: 'operation_selector',
  title: 'Need more practice',
});

const createInput = (
  overrides: Partial<Parameters<typeof useKangurGameRuntimeActions>[0]> = {}
): Parameters<typeof useKangurGameRuntimeActions>[0] => ({
  activeSessionRecommendation: null,
  advanceQuestion: vi.fn(),
  canAccessParentAssignments: false,
  completeSession: vi.fn(),
  currentQuestionIndex: 0,
  difficulty: 'medium',
  guestPlayerName: '',
  kangurMode: null,
  operation: 'addition',
  progressTranslate: (key) => key,
  refreshAssignments: vi.fn(),
  resetGame: vi.fn(),
  resultTranslate: (key) => key,
  runGameLoopTimer: vi.fn(),
  score: 0,
  screen: 'home',
  sessionPlayerName: '',
  setActiveSessionRecommendation: vi.fn(),
  setCurrentQuestionIndex: vi.fn(),
  setDifficulty: vi.fn(),
  setGuestPlayerName: vi.fn(),
  setKangurMode: vi.fn(),
  setLaunchableGameInstanceId: vi.fn(),
  setOperation: vi.fn(),
  setQuestions: vi.fn(),
  setScore: vi.fn(),
  setScreen: vi.fn(),
  setSessionPlayerName: vi.fn(),
  setStartTime: vi.fn(),
  setTimeTaken: vi.fn(),
  setXpToast: vi.fn(),
  showXpToast: vi.fn(),
  startSession: vi.fn(),
  startTime: 0,
  subject: 'maths',
  subjectKey: 'learner-1',
  totalQuestions: 10,
  user: null,
  ...overrides,
});

describe('useKangurGameRuntimeActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateQuestionsMock.mockReturnValue([createQuestion('generated-1')]);
    generateTrainingQuestionsMock.mockReturnValue([createQuestion('training-1')]);
    resolveKangurScoreSubjectMock.mockReturnValue('maths');
    scoreCreateMock.mockResolvedValue(null);
    buildKangurCompletedGameOutcomeMock.mockReturnValue({
      awardedXp: 30,
      awardedBadges: ['first_game'],
      awardedBreakdown: [{ kind: 'base', label: 'Round completed', xp: 30 }],
      dailyQuestToastHint: null,
      isGreat: true,
      isPerfect: true,
      nextBadgeToastHint: null,
      recommendationToastHint: null,
      selectedOperation: 'addition',
    });
  });

  it('starts an operation session atomically through startSession', () => {
    const recommendation = createRecommendation();
    const startSession = vi.fn();
    const setSessionPlayerName = vi.fn();
    const input = createInput({
      guestPlayerName: 'Ada',
      setSessionPlayerName,
      startSession,
    });

    const { result } = renderHook(() => useKangurGameRuntimeActions(input));

    act(() => {
      result.current.handleSelectOperation('division', 'hard', { recommendation });
    });

    expect(generateQuestionsMock).toHaveBeenCalledWith('division', 'hard', 10);
    expect(setSessionPlayerName).toHaveBeenCalledWith('Ada');
    expect(startSession).toHaveBeenCalledWith({
      difficulty: 'hard',
      operation: 'division',
      questions: [createQuestion('generated-1')],
      recommendation,
      startTime: expect.any(Number),
    });
  });

  it('starts mixed training sessions through the same atomic startSession path', () => {
    const startSession = vi.fn();
    const input = createInput({
      guestPlayerName: 'Mila',
      startSession,
    });

    const { result } = renderHook(() => useKangurGameRuntimeActions(input));

    act(() => {
      result.current.handleStartTraining({
        categories: ['geometry', 'logic'],
        count: 6,
        difficulty: 'easy',
      });
    });

    expect(generateTrainingQuestionsMock).toHaveBeenCalledWith(['geometry', 'logic'], 'easy', 6);
    expect(startSession).toHaveBeenCalledWith({
      difficulty: 'easy',
      operation: 'mixed',
      questions: [createQuestion('training-1')],
      recommendation: null,
      startTime: expect.any(Number),
    });
  });

  it('schedules the next question on non-final correct answers without completing the session', () => {
    let scheduledAdvance: (() => void) | null = null;
    const advanceQuestion = vi.fn();
    const completeSession = vi.fn();
    const runGameLoopTimer = vi.fn((fn: () => void) => {
      scheduledAdvance = fn;
    });
    const setScore = vi.fn();
    const input = createInput({
      advanceQuestion,
      completeSession,
      currentQuestionIndex: 1,
      runGameLoopTimer,
      score: 4,
      setScore,
      totalQuestions: 3,
    });

    const { result } = renderHook(() => useKangurGameRuntimeActions(input));

    act(() => {
      result.current.handleAnswer(true);
    });

    expect(setScore).toHaveBeenCalledWith(5);
    expect(completeSession).not.toHaveBeenCalled();
    expect(runGameLoopTimer).toHaveBeenCalledWith(expect.any(Function), 1000);
    expect(trackKangurClientEventMock).not.toHaveBeenCalled();

    scheduledAdvance?.();

    expect(advanceQuestion).toHaveBeenCalledTimes(1);
  });

  it('completes the final answer, persists rewards, and schedules the result screen', async () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(5_000);
    let scheduledResult: (() => void) | null = null;
    const completeSession = vi.fn();
    const refreshAssignments = vi.fn();
    const runGameLoopTimer = vi.fn((fn: () => void) => {
      scheduledResult = fn;
    });
    const setScreen = vi.fn();
    const setSessionPlayerName = vi.fn();
    const showXpToast = vi.fn();
    const input = createInput({
      canAccessParentAssignments: true,
      completeSession,
      currentQuestionIndex: 1,
      guestPlayerName: 'Ada',
      refreshAssignments,
      runGameLoopTimer,
      score: 1,
      screen: 'playing',
      setScreen,
      setSessionPlayerName,
      showXpToast,
      startTime: 1_000,
      totalQuestions: 2,
    });

    const { result } = renderHook(() => useKangurGameRuntimeActions(input));

    await act(async () => {
      result.current.handleAnswer(true);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(setSessionPlayerName).toHaveBeenCalledWith('Ada');
    expect(completeSession).toHaveBeenCalledWith({
      score: 2,
      timeTaken: 4,
    });
    expect(buildKangurCompletedGameOutcomeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        difficulty: 'medium',
        nextScore: 2,
        operation: 'addition',
        ownerKey: 'learner-1',
        subject: 'maths',
        taken: 4,
        totalQuestions: 2,
      })
    );
    expect(scoreCreateMock).toHaveBeenCalledWith({
      correct_answers: 2,
      operation: 'addition',
      player_name: 'Ada',
      score: 2,
      subject: 'maths',
      time_taken: 4,
      total_questions: 2,
      xp_earned: 30,
    });
    expect(trackKangurClientEventMock).toHaveBeenCalledWith(
      'kangur_game_completed',
      expect.objectContaining({
        accuracyPercent: 100,
        correctAnswers: 2,
        difficulty: 'medium',
        isGreat: true,
        isPerfect: true,
        kangurMode: 'practice',
        operation: 'addition',
        playerNamePresent: true,
        screen: 'playing',
        totalQuestions: 2,
        xpAwarded: 30,
      })
    );
    expect(showXpToast).toHaveBeenCalledWith(
      30,
      ['first_game'],
      [{ kind: 'base', label: 'Round completed', xp: 30 }],
      null,
      null,
      null
    );
    expect(refreshAssignments).toHaveBeenCalledTimes(1);
    expect(setScreen).not.toHaveBeenCalled();

    scheduledResult?.();

    expect(setScreen).toHaveBeenCalledWith('result');

    nowSpy.mockRestore();
  });

  it('routes home and restart flows through resetGame after clearing pending quick starts', () => {
    const recommendation = createRecommendation();
    const resetGame = vi.fn();
    const setKangurMode = vi.fn();
    const setSessionPlayerName = vi.fn();
    const input = createInput({
      resetGame,
      setKangurMode,
      setSessionPlayerName,
    });

    const { result } = renderHook(() => useKangurGameRuntimeActions(input));

    act(() => {
      result.current.handleStartGame();
      result.current.handleStartKangur('timed', { recommendation });
      result.current.handleRestart();
      result.current.handleHome();
    });

    expect(clearPendingKangurGameQuickStartMock).toHaveBeenCalledTimes(4);
    expect(setSessionPlayerName).toHaveBeenCalledWith('Gracz');
    expect(setKangurMode).toHaveBeenCalledWith('timed');
    expect(resetGame).toHaveBeenNthCalledWith(1, {
      launchableGameInstanceId: null,
      recommendation: null,
      screen: 'operation',
    });
    expect(resetGame).toHaveBeenNthCalledWith(2, {
      launchableGameInstanceId: null,
      recommendation,
      screen: 'kangur',
    });
    expect(resetGame).toHaveBeenNthCalledWith(3, {
      launchableGameInstanceId: null,
      recommendation: null,
      screen: 'operation',
    });
    expect(resetGame).toHaveBeenNthCalledWith(4, {
      launchableGameInstanceId: null,
      recommendation: null,
      screen: 'home',
    });
  });
});

describe('canEarnKangurRewards', () => {
  it('disables rewards only for parent accounts without an active learner', () => {
    expect(canEarnKangurRewards(null)).toBe(true);
    expect(canEarnKangurRewards({ actorType: 'parent', activeLearner: null } as never)).toBe(
      false
    );
    expect(
      canEarnKangurRewards({ actorType: 'parent', activeLearner: { id: 'learner-1' } } as never)
    ).toBe(true);
  });
});
